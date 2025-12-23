package gocode

import (
	"aichat/gologs"
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
)

func callOpenRouter(messages []interface{}, reqModel string) (string, string) {

	requestObj := gin.H{
		"model":    reqModel,
		"messages": messages, // Use converted messages
	}

	var response = ""
	var model = ""

	jsonData, err := json.Marshal(requestObj)
	if err != nil {
		gologs.Error.Printf("Failed to marshal request: %v", err)
		return err.Error(), "error"
	}

	req, err := http.NewRequest("POST",
		"https://openrouter.ai/api/v1/chat/completions",
		bytes.NewBuffer(jsonData))
	if err != nil {
		gologs.Error.Printf("Failed to create request: %v", err)
		return err.Error(), "error"
	}

	req.Header.Set("Authorization", "Bearer "+openrouter_api_key)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		gologs.Error.Printf("Failed to send request: %v", err)
		return err.Error(), "error"
	}
	defer resp.Body.Close()

	// Read response and convert to string
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		gologs.Error.Printf("Failed to read response: %v", err)
		return err.Error(), "error"
	}
	responseBody := string(respBytes)

	// Check for HTTP errors
	if resp.StatusCode != 200 {
		responseBodyParsed := gjson.Get(responseBody, "error.metadata.raw").String()
		gologs.Error.Printf("API returned error status %d: %s", resp.StatusCode, responseBodyParsed)
		return responseBodyParsed, "error"
	}

	response = gjson.Get(responseBody, "choices.0.message.content").String()
	model = gjson.Get(responseBody, "model").String()

	return response, model
}
