package gologs

import (
	"io"
	"log"
	"os"
	"path/filepath"

	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	Info  *log.Logger
	Error *log.Logger
)

// Init sets up the rolling file + optional stdout/stderr.
func Init() {
	w := &lumberjack.Logger{
		Filename:   filepath.Join("logs", "app.log"),
		MaxSize:    100,
		MaxBackups: 10,
		MaxAge:     30,
		Compress:   true,
	}

	Info = log.New(io.MultiWriter(w, os.Stdout), "INFO  ", log.LstdFlags)
	Error = log.New(io.MultiWriter(w, os.Stderr), "ERROR ", log.LstdFlags|log.Lshortfile)
}
