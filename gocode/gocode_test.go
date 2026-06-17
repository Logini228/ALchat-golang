package gocode_test

import (
	"aichat/gocode"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestGetLastNLines(t *testing.T) {
	uniqueMsg := fmt.Sprintf("log_debug_test_%d", time.Now().UnixNano())

	logDir := "../logs"
	logPath := filepath.Join(logDir, "app.log")

	if err := os.MkdirAll(logDir, 0755); err != nil {
		t.Fatalf("❌ Failed to create log dir: %v", err)
	}

	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatalf("❌ Failed to open log file: %v", err)
	}

	_, err = f.WriteString(uniqueMsg + "\n")
	f.Close()
	if err != nil {
		t.Fatalf("❌ Failed to write to log file: %v", err)
	}

	lines, err := gocode.GetLastNLines(logPath, 10)
	if err != nil {
		t.Fatalf("❌ Failed to read logs: %v", err)
	}

	found := false
	for _, line := range lines {
		if strings.Contains(line, uniqueMsg) {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("❌ FAILED: Could not find the unique message in the last 10 lines!")
		t.Logf("Lines actually read: %v", lines)
	} else {
		t.Logf("✅ SUCCESS: Successfully found the latest unique message!")
		t.Logf("👉 Last lines read from file: %s", lines)
	}
}
