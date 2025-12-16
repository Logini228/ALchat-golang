package gocode

import (
	"io"
	"net/http"
	"strings"
)

func callOpenRouter(requestBody string) string {
	// Convert string to format HTTP needs
	req, err := http.NewRequest("POST",
		"https://openrouter.ai/api/v1/chat/completions",
		strings.NewReader(requestBody))
	if err != nil {
		return ""
	}

	req.Header.Set("Authorization", "Bearer "+openrouter_api_key)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return ""
	}
	defer resp.Body.Close()

	// Read response and convert to string
	respBytes, _ := io.ReadAll(resp.Body)
	responseBody := string(respBytes) // Convert []byte to string

	return responseBody
}
