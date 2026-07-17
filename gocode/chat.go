package gocode

import (
	"aichat/gologs"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/tidwall/gjson"
)

func buildMessageChain(reqPrompt string, reqHistory []gjson.Result, isEmpty bool) []interface{} {
	var messages []interface{}
	messages = append(messages, gin.H{"role": "system", "content": "answer to user precisely"})

	if !isEmpty {
		var ids []string
		for _, entry := range reqHistory {
			if entry.Get("0").Bool() {
				ids = append(ids, entry.Get("1").String())
			}
		}

		gologs.Info.Println("ids:", ids)

		idsContents := messUUIDsToContent(ids)

		for _, entry := range reqHistory {
			isID := entry.Get("0").Bool()
			content := entry.Get("1").String()

			if isID {
				if data, exists := idsContents[content]; exists {
					role := "assistant"
					if data.SenderUser {
						role = "user"
					}
					messages = append(messages, gin.H{"role": role, "content": data.Sender + ": " + data.Message})
				}
			} else {
				messages = append(messages, gin.H{"role": "user", "content": content})
			}
		}
	}
	messages = append(messages, gin.H{"role": "user", "content": reqPrompt})
	return messages
}

func streamModelResponses(c *gin.Context, chatid string, models []gjson.Result, messages []interface{}, promptMessUUID string) {
	initialData, _ := json.Marshal(gin.H{
		"model": "prompt", "response": " ", "mess_uuid": promptMessUUID,
	})

	c.Writer.Write(initialData)
	c.Writer.WriteString("\n")
	c.Writer.Flush()

	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, modelResult := range models {
		wg.Add(1)
		go func(m string) {
			defer wg.Done()
			response, resModel, code := callOpenRouter(messages, m)
			gologs.Info.Println(response)
			if response == "" {
				return
			}

			messUUID := InsertChatData(chatid, resModel, false, response)

			jsonData, _ := json.Marshal(gin.H{
				"model": resModel, "response": response, "mess_uuid": messUUID, "code": code,
			})

			mu.Lock()
			c.Writer.Write(jsonData)
			c.Writer.WriteString("\n")
			c.Writer.Flush()
			mu.Unlock()
		}(modelResult.String())
	}
	wg.Wait()
}

func callOpenRouter(messages []interface{}, reqModel string) (string, string, int64) {

	requestObj := gin.H{
		"model":    reqModel,
		"messages": messages, // Use converted messages
	}

	var response = ""
	var model = ""
	var errCode int64 = 0

	jsonData, err := json.Marshal(requestObj)
	if err != nil {
		gologs.Error.Printf("Failed to marshal request: %v", err)
		return err.Error(), reqModel, 0
	}

	req, err := http.NewRequest("POST",
		"https://openrouter.ai/api/v1/chat/completions",
		bytes.NewBuffer(jsonData))
	if err != nil {
		gologs.Error.Printf("Failed to create request: %v", err)
		return err.Error(), reqModel, 0
	}

	req.Header.Set("Authorization", "Bearer "+openrouter_api_key)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		gologs.Error.Printf("Failed to send request: %v", err)
		return err.Error(), reqModel, 0
	}
	defer resp.Body.Close()

	// Read response and convert to string
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		gologs.Error.Printf("Failed to read response: %v", err)
		return err.Error(), reqModel, 0
	}
	responseBody := string(respBytes)

	// Check for HTTP errors
	if resp.StatusCode != 200 {
		responseBodyParsed := gjson.Get(responseBody, "error.message").String()
		gologs.Error.Printf("API returned error status %d: %s", resp.StatusCode, responseBodyParsed)
		return responseBodyParsed, reqModel, 0
	}

	response = gjson.Get(responseBody, "choices.0.message.content").String()
	model = gjson.Get(responseBody, "model").String()
	errCode = gjson.Get(responseBody, "code").Int()

	return response, model, errCode
}
