package gocode

import (
	"bufio"
	"io"
	"math/rand/v2"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"

	"aichat/gologs"
)

var openrouter_api_key string

const tenYears = 60 * 60 * 24 * 365 * 10 // 315,360,000 seconds
const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func CreateChat(c *gin.Context) {
	shortToken, err := c.Cookie("shortJWT")
	if err != nil || shortToken == "" {
		gologs.Warning.Println("invalid short token", err)
		c.JSON(http.StatusUnauthorized, gin.H{"status": "Login not success"})
		return
	}

	valid, uuid, email := ParseJWT(shortToken, false)
	if !valid || uuid == "" || email == "" {
		gologs.Warning.Println("invalid or expired short token", err)
		c.JSON(http.StatusUnauthorized, gin.H{"status": "invalid or expired authentication token"})
		return
	}

	b := make([]byte, 16)
	for i := range b {
		b[i] = charset[rand.IntN(len(charset))]
	}
	var chatid = string(b)
	gologs.Info.Println("created a chat with id: ", chatid)

	CreateChatDB(uuid, chatid)

	c.JSON(200, gin.H{"chatid": chatid})
}

func GetMessagesForChat(c *gin.Context) {
	chatid := c.Param("chatid")

	shortToken, err := c.Cookie("shortJWT")
	if err != nil || shortToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "Login not success"})
		return
	}

	valid, uuid, email := ParseJWT(shortToken, false)
	if !valid || uuid == "" || email == "" {
		gologs.Warning.Println("loginJWT: invalid or expired long token")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "invalid or expired authentication token"})
		return
	}

	if !CanAccessChat(uuid, chatid) {
		gologs.Warning.Println("user cant access chat or somethings wrong")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "unauthorized"})
		return
	}

	messages, valid2 := QueryChatMessages(chatid)

	gologs.Info.Println("Tried to access chat with id: ", chatid)

	c.JSON(200, gin.H{"messages": messages, "valid": valid2})
}

func AskLLM(c *gin.Context) {
	save := true
	shortToken, _ := c.Cookie("shortJWT")
	valid, userUUID, _ := ParseJWT(shortToken, false)
	if !valid {
		//c.JSON(http.StatusUnauthorized, gin.H{"status": "Unauthorized"})
		//return
		save = false
	}

	bodyBytes, _ := io.ReadAll(c.Request.Body)
	body := string(bodyBytes)
	chatid := c.GetHeader("X-chatid")

	reqPrompt := gjson.Get(body, "prompt").String()
	messages := buildMessageChain(
		reqPrompt,
		gjson.Get(body, "history").Array(),
		gjson.Get(body, "empty").Bool(),
	)

	mess_uuid := "undefined"

	if save {
		mess_uuid = InsertChatData(chatid, userUUID, true, reqPrompt)
	}

	c.Header("Content-Type", "application/x-ndjson")
	streamModelResponses(c, chatid, gjson.Get(body, "model").Array(), messages, mess_uuid)
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Auth(c *gin.Context) {

	authtype := c.GetHeader("X-authtype")

	var loginReq LoginRequest
	var email, password string
	//var recaptcha string

	if authtype == "login" || authtype == "register" {

		if err := c.ShouldBindJSON(&loginReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			gologs.Error.Printf("error in auth: %v", err)
			return
		}

		email = loginReq.Email
		password = loginReq.Password

		//recaptcha = c.GetHeader("g-recaptcha-response")
		//if !(VerifyRecaptcha(recaptcha)) {		}

		gologs.Info.Println("tried to auth")

	}

	switch authtype {
	case "login":
		if LoginWithCredentials(email, password) {
			c.JSON(200, gin.H{
				"status": "Login success",
				"token":  "",
			})
		} else {
			c.JSON(200, gin.H{
				"status": "Login not success",
				"token":  "",
			})
		}

	case "register":
		if RegisterWithCredentials(email, password) {
			c.JSON(200, gin.H{
				"status": "Login success",
				"token":  "",
			})
		} else {
			c.JSON(200, gin.H{
				"status": "Login not success",
				"token":  "",
			})
		}

	case "google":
		var body struct {
			Code string `json:"code"`
		}
		if c.BindJSON(&body) != nil || body.Code == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing code"})
			return
		}

		user, verified := VerifyLoginGoogle(body.Code)

		if verified {
			uuid, email := GoogleToDB(user)
			token := CreateJWT(uuid, email, true) // true for long

			c.SetSameSite(http.SameSiteLaxMode) // Add this line
			// Set the token as an httpOnly cookie
			c.SetCookie(
				"longJWT", // cookie name
				token,     // cookie value
				tenYears,  // max age
				"/",       // path
				"",        // domain (empty = current domain)
				(!Debug),  // secure (HTTPS only)
				true,      // httpOnly (JS can't access it)
			)

			// Return only status to client (token is in cookie)
			c.JSON(200, gin.H{
				"status": "Login success",
			})
		} else {
			c.JSON(200, gin.H{
				"status": "Login not success",
			})
		}

	case "reset":

	case "loginJWT":
		longToken, err := c.Cookie("longJWT")
		if err != nil || longToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "Login not success"})
			return
		}

		valid, uuid, email := ParseJWT(longToken, true)
		if !valid || uuid == "" || email == "" {
			gologs.Warning.Println("loginJWT: invalid or expired long token")
			c.JSON(http.StatusUnauthorized, gin.H{"status": "invalid or expired authentication token"})
			return
		}

		shortToken := CreateJWT(uuid, email, false) // false = short expiry
		c.SetCookie(
			"shortJWT",
			shortToken,
			tenYears,
			"/",
			"",
			!Debug, // secure only in prod
			true,   // httpOnly
		)

		name, avatar := QueryUser(uuid)
		c.JSON(http.StatusOK,
			gin.H{
				"status": "token success",
				"name":   name,
				"avatar": avatar,
			})

	case "refreshJWT":
		longToken, err := c.Cookie("longJWT")
		if err != nil || longToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"status": "Login not success"})
			return
		}

		valid, uuid, email := ParseJWT(longToken, false)
		if !valid || uuid == "" || email == "" {
			gologs.Warning.Println("refreshJWT: invalid or expired long token")
			c.JSON(http.StatusUnauthorized, gin.H{"status": "invalid or expired authentication token"})
			return
		}

		shortToken := CreateJWT(uuid, email, false) // false = short expiry
		c.SetCookie(
			"shortJWT",
			shortToken,
			tenYears,
			"/",
			"",
			!Debug, // secure only in prod
			true,   // httpOnly
		)
		c.JSON(http.StatusOK, gin.H{"status": "token success"})

	default:
		gologs.Error.Println("Unexpected authtype: " + authtype)
		return
	}

	gologs.Info.Println("auth triggered with authtype: " + authtype)
}

func GetModelsFromDB(c *gin.Context) {
	var body struct {
		Input string `json:"input"`
	}
	if err := c.BindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		gologs.Error.Printf("getmodels failed: %v", err)
		return
	}

	models, err := QueryModels("free")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		gologs.Error.Printf("getmodels failed: %v", err)
		return
	}
	c.JSON(http.StatusOK, models)
}

func GetChatList(c *gin.Context) {
	shortToken, err := c.Cookie("longJWT") // using long there instead of short
	//because it would have to wait for short token on frontend
	if err != nil || shortToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"status": "Login not success"})
		return
	}

	valid, uuid, email := ParseJWT(shortToken, false)
	if !valid || uuid == "" || email == "" {
		gologs.Warning.Println("refreshJWT: invalid or expired long token")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "invalid or expired authentication token"})
		return
	}

	chatlist, valid1 := QueryUserChatList(uuid)
	if !valid1 || chatlist == nil {
		gologs.Warning.Println("either a new user or error getting chatlist")
	}

	c.JSON(http.StatusOK, gin.H{"chatlist": chatlist})
}

func GetDebugLogs(c *gin.Context) {
	// Match the path defined in your gologs.Init()
	logPath := filepath.Join("logs", "app.log")

	lines, err := GetLastNLines(logPath, 50)
	if err != nil {
		// If the file doesn't exist yet (e.g., app just started), return an empty array
		if os.IsNotExist(err) {
			c.JSON(http.StatusOK, gin.H{"logs": []string{}})
			return
		}

		// Log the error using your gologs package
		// gologs.Error.Printf("Failed to read log file: %v", err)

		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logs": lines,
	})
}

// getLastNLines efficiently reads the last N lines of a file.
// It uses a rolling buffer to ensure memory usage never exceeds N lines.
func GetLastNLines(filename string, n int) ([]string, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	// Pre-allocate slice with capacity n to avoid memory reallocations
	lines := make([]string, 0, n)
	scanner := bufio.NewScanner(file)

	// Increase buffer size in case you have extremely long log lines (e.g., large JSON dumps or stack traces)
	buf := make([]byte, 0, 64*1024)
	scanner.Buffer(buf, 1024*1024) // 1MB max line size

	for scanner.Scan() {
		line := scanner.Text()
		// Trim carriage return to handle Windows-style line endings (\r\n) safely
		line = strings.TrimSuffix(line, "\r")

		// Rolling buffer logic: keep only the last N lines
		if len(lines) == n {
			copy(lines, lines[1:]) // Shift existing elements left by 1
			lines[n-1] = line      // Insert the new line at the very end
		} else {
			lines = append(lines, line)
		}
	}

	if err := scanner.Err(); err != nil {
		return nil, err
	}

	return lines, nil
}
