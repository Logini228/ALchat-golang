package main

import (
	"github.com/gin-gonic/gin"

	"aichat/gocode"
	"aichat/gologs"
)

func main() {
	gologs.Init()
	gocode.Init()

	router := gin.Default()
	router.Use(CORSMiddleware())

	router.GET("/ping", func(c *gin.Context) { c.String(200, "pong") })
	router.GET("/chat/:chatid", gocode.GetMessagesForChat)
	router.POST("/newchat", gocode.CreateChat)
	router.POST("/chatlist", gocode.GetChatList)
	router.POST("/chat", gocode.AskLLM)
	router.POST("/auth", gocode.Auth)
	router.POST("/models", gocode.GetModelsFromDB)
	router.POST("/debug", gocode.GetDebugLogs)

	startServer(router)

	defer gocode.CloseDB()
}
