package main

import (
	"github.com/gin-gonic/gin"

	"aichat/gocode"
	logger "aichat/logs"
)

func main() {
	logger.Init()
	gocode.Init()

	router := gin.Default()
	router.Use(CORSMiddleware())

	router.GET("/ping", func(c *gin.Context) { c.String(200, "pong") })
	router.GET("/chat/:chatid", gocode.GetChatFromDB)
	router.POST("/chat", gocode.AskLLM)
	router.POST("/auth", gocode.Auth)

	startServer(router)
	
	defer gocode.CloseDB()
}
