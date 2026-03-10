package gocode

import (
	"aichat/gologs"
	"os"

	"github.com/joho/godotenv"
)

var Debug bool = true
var Domain string = "localhost"

func Init() {
	gologs.Init()
	gologs.Info.Println("gocode library loaded")

	LoadEnv()
	DBconnect()
	ModelsOpenRouter()

}

func LoadEnv() {
	err := godotenv.Load()
	if err != nil {
		gologs.Error.Println("Error loading .env file")
	}

	jwt_secret_key = os.Getenv("JWT_SECRET_KEY")
	google_recaptcha_site = os.Getenv("GOOGLE_RECAPTCHA_SITE")
	openrouter_api_key = os.Getenv("OPENROUTER_API_KEY")
	password_secret_key = os.Getenv("PASSWORD_SECRET_KEY")

	user = os.Getenv("POSTGRES_USER")
	password = os.Getenv("POSTGRES_PASSWORD")
	dbname = os.Getenv("POSTGRES_DB")
	host = os.Getenv("POSTGRES_HOST")
	port = os.Getenv("POSTGRES_PORT")
}
