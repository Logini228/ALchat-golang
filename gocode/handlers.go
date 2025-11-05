package gocode

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"

	logger "aichat/logs"
)

var openrouter_api_key string

func GetChatFromDB(c *gin.Context) {
	// Read request
	chatid := c.Param("chatid")

	// Query the request
	messages, err := QueryChatData(chatid)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	// Send the answer
	c.JSON(200, messages)
}

func AskLLM(c *gin.Context) {
	// Get the request body
	body, _ := io.ReadAll(c.Request.Body)

	chatid := c.GetHeader("X-chatid")
	InsertChatData(chatid, "user", body)

	// Make request to LLM API
	req, _ := http.NewRequest("POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(body))
	req.Header.Set("Authorization", "Bearer "+openrouter_api_key)
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	// Read response
	respBody, _ := io.ReadAll(resp.Body)

	// Parse response to extract the message content
	var result map[string]interface{}
	json.Unmarshal(respBody, &result)

	// Store LLM response to database
	InsertChatData(chatid, "ai", respBody)

	// Return response
	c.JSON(resp.StatusCode, result)
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

		if VerifyLoginGoogle(body.Code) {
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

	case "reset":

	case "loginJWT":

	default:
		logger.Error.Println("Unexpected authtype: " + authtype)
	}

	fmt.Println("auth triggered with authtype: " + authtype)

}
