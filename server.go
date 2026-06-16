package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"aichat/gocode"
	"aichat/gologs"
)

func startServer(router *gin.Engine) {
	srv := &http.Server{
		Addr:    "0.0.0.0:8080",
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			gologs.Error.Printf("listen: %s\n", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	preShutdown()

	gologs.Info.Println("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		gologs.Error.Println("forced shutdown:", err)
	} else {
		gologs.Info.Println("server stopped")
	}
}

func preShutdown() {
	gocode.CloseDB()
}

func CORSMiddleware() gin.HandlerFunc {
	// Allowlist of trusted origins
	allowedOrigins := map[string]bool{
		"http://localhost:3000":  true,
		"http://127.0.0.1:3000":  true,
		"https://yourdomain.com": true, // Add production later
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Only set CORS headers if origin is in allowlist
		if allowedOrigins[origin] {
			c.Header("Access-Control-Allow-Origin", origin) // ✅ Echo exact origin
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-chatid, X-authtype, g-recaptcha-response")
			c.Header("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")
		}

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
