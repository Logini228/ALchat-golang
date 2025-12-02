package gocode

import (
	logger "aichat/logs"
	"log"
	"os"

	"github.com/joho/godotenv"
)

func Init() {
	logger.Init()
	logger.Info.Println("gocode library loaded")

	LoadEnv()
	DBconnect()
	defer CloseDB()
}

func LoadEnv() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	jwt_secret_key = os.Getenv("JWT_SECRET_KEY")
	google_recaptcha_site = os.Getenv("GOOGLE_RECAPTCHA_SITE")
	openrouter_api_key = os.Getenv("OPENROUTER_API_KEY")

	user = os.Getenv("POSTGRES_USER")
	password = os.Getenv("POSTGRES_PASSWORD")
	dbname = os.Getenv("POSTGRES_DB")
	host = os.Getenv("POSTGRES_HOST")
	port = os.Getenv("POSTGRES_PORT")
}
