package gocode

import (
	"fmt"
	"io"
	"net/http"

	"github.com/tidwall/gjson"
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

	var entries []ModelEntry
	gjson.GetBytes(body, "data").ForEach(func(_, model gjson.Result) bool {
		// Helper to safely get float64 from string or number

		entry := ModelEntry{
			Aggregator: "OpenRouter",
			Provider:   model.Get("top_provider.context_length").String(), // or use "id" prefix, e.g. strings.Split(model.Get("id").String(), "/")[0]
			ID:         model.Get("id").String(),
			Name:       model.Get("name").String(),
			Created:    model.Get("created").Int(),
			Context:    model.Get("context_length").Int(),
			Price:      []float64{model.Get("pricing.prompt").Float(), model.Get("pricing.completion").Float()},
			Inputs:     toStringSlice(model.Get("architecture.input_modalities").Array()),
			Outputs:    toStringSlice(model.Get("architecture.output_modalities").Array()),
			Original:   model.Raw,
		}
		entries = append(entries, entry)
		return true
	})

	return entries, nil
}

// Helper function
func toStringSlice(results []gjson.Result) []string {
	s := make([]string, len(results))
	for i, r := range results {
		s[i] = r.String()
	}
	return s
}
