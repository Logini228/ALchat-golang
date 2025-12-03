package gocode

import (
	"fmt"
	"io"
	"net/http"
)

type ModelEntry struct {
	Aggregator string
	Provider   string
	ID         string
	Name       string
	Price      []float64
	Created    int64
	Context    int64
	Inputs     []string
	Outputs    []string
	Original   string
}

func ModelsOpenRouter() ([]ModelEntry, error) {
	url := "https://openrouter.ai/api/v1/models"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header.Add("Authorization", "Bearer "+openrouter_api_key)

	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API returned non-200 status: %d", res.StatusCode)
	}

	body, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}
	// Parse JSON with gjson
	var entries []ModelEntry
	gjson.GetBytes(body, "data").ForEach(func(_, model gjson.Result) bool {
		entry := ModelEntry{
			Aggregator: "OpenRouter",                                      // hardcoded as you wanted
			Provider:   model.Get("top_provider.context_length").String(), // just an example—replace with real provider if needed
			ID:         model.Get("id").String(),
			Name:       model.Get("name").String(),
			Created:    model.Get("created").Int(),
			Context:    model.Get("context_length").Int(),
			// Optional: store pricing as floats
			Price: []float64{
				parseFloat(model.Get("pricing.prompt").String()),
				parseFloat(model.Get("pricing.completion").String()),
			},
			// Inputs/Outputs/Original — you’ll need to decide what goes here
			// If they’re not in the API, maybe leave empty or derive from other fields
			Inputs:   []string{}, // fill if you have logic
			Outputs:  []string{}, // fill if you have logic
			Original: model.Raw,  // <-- this stores the raw JSON of the model object as string
		}
		entries = append(entries, entry)
		return true // continue iteration
	})

	return entries, nil
}
