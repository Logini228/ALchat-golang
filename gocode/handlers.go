package gocode

import (
	"encoding/json"
	"io"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"

	"aichat/gologs"
)

var openrouter_api_key string

func GetChatFromDB(c *gin.Context) {
	// Read request
	chatid := c.Param("chatid")

	// Query the request
	messages, err := QueryChatData(chatid)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		gologs.Error.Printf("error getting chat from db: %v", err)
		return
	}

	// Send the answer
	c.JSON(200, messages)
}

func AskLLM(c *gin.Context) {
	bodyBytes, _ := io.ReadAll(c.Request.Body)
	requestBody := string(bodyBytes)
	chatid := c.GetHeader("X-chatid")

	request := gjson.Get(requestBody, "messages.0.content").String()
	reqModels := gjson.Get(requestBody, "model").Array()
	messagesgjson := gjson.Get(requestBody, "messages").Array()

	var messages []interface{}
	for _, msg := range messagesgjson {
		messages = append(messages, msg.Value())
	}

	InsertChatData(chatid, "user", request)

	// Set up NDJSON streaming headers
	c.Header("Content-Type", "application/x-ndjson")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")

	// WaitGroup to wait for all goroutines to finish
	var wg sync.WaitGroup

	for _, model := range reqModels {
		wg.Add(1) // Increment counter
		go func(m string) {
			defer wg.Done() // Decrement when done

			response, resModel, success := callOpenRouter(messages, m) // Pass m (string)
			if response == "" {
				gologs.Error.Println("something went wrong in AskLLM")
				return
			}

			// Send via NDJSON
			responseObj := gin.H{
				"model":    resModel,
				"response": response,
				"success":  success,
			}
			jsonData, _ := json.Marshal(responseObj)
			c.Writer.Write(jsonData)
			c.Writer.WriteString("\n")
			c.Writer.Flush()

			InsertChatData(chatid, resModel, response)
		}(model.String()) // Convert gjson.Result to string!
	}

	wg.Wait() // Wait for all goroutines to complete before function exits
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func Auth(c *gin.Context) {

	authtype := c.GetHeader("X-authtype")

	var loginReq LoginRequest
	var email, password, recaptcha string

	if authtype == "login" || authtype == "register" {

		if err := c.ShouldBindJSON(&loginReq); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			gologs.Error.Printf("error in auth: %v", err)
			return
		}

		email = loginReq.Email
		password = loginReq.Password

		recaptcha = c.GetHeader("g-recaptcha-response")

		if !(VerifyRecaptcha(recaptcha)) {

		}
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

			// Set the token as an httpOnly cookie
			c.SetCookie(
				"longJWT", // cookie name
				token,     // cookie value
				86400*7,   // max age in seconds (7 days for "long" token)
				"/",       // path
				"",        // domain (empty = current domain)
				true,      // secure (HTTPS only)
				true,      // httpOnly (JS can't access it)
			)

			// Return only status to client (token is in cookie)
			c.JSON(200, gin.H{
				"status": "Login success",
			})
		} else {
			c.JSON(200, gin.H{
				"status": "Login not success",
				"token":  "",
			})
		}

	case "reset":

	case "loginJWT":

		validJWT := true

		if validJWT {
			c.SetCookie(
				"shortJWT", // cookie name
				token,      // cookie value
				86400*7,    // max age in seconds (7 days for "long" token)
				"/",        // path
				"",         // domain (empty = current domain)
				true,       // secure (HTTPS only)
				true,       // httpOnly (JS can't access it)
			)
		}

	default:
		gologs.Error.Println("Unexpected authtype: " + authtype)
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

	models, err := QueryModels(body.Input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		gologs.Error.Printf("getmodels failed: %v", err)
		return
	}
	c.JSON(http.StatusOK, models)
}
