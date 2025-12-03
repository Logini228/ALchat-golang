package gocode

import (
	"aichat/gologs"
	"context"
	"encoding/json"
	"fmt"
	"io"
	_ "log"
	"net/http"
	"net/url"
	"os"
	"time"

	recaptcha "cloud.google.com/go/recaptchaenterprise/v2/apiv1"
	recaptchapb "cloud.google.com/go/recaptchaenterprise/v2/apiv1/recaptchaenterprisepb"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/option"
	//"github.com/googleapis/google-api-go-client"
)

var jwt_secret_key string
var google_recaptcha_site string

func CreateJWT(uuid string, email string) {
	// Create a new token object
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   uuid,
		"email": email,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(time.Hour * 24).Unix(),
	})

	// Sign the token with a secret key
	secretKey := []byte(jwt_secret_key)
	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		fmt.Println("Error signing token:", err)
		return
	}

	fmt.Println("Signed JWT:", signedToken)
}

func ParseJWT(tokenString string) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwt_secret_key), nil
	})

	if err != nil {
		fmt.Println("Error parsing token:", err)
		return
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		fmt.Printf("Token claims: %v\n", claims)
	} else {
		fmt.Println("Invalid token")
	}
}

func LoginWithCredentials(email string, password string) bool {
	if LoginWithDB(email, password) == "" {
		fmt.Println("no success")
		return false
	} else {
		fmt.Println("success")
		return true
	}
}

func RegisterWithCredentials(email string, password string) bool {
	if RegisterWithDB(email, password) {
		fmt.Println("no success")
		return false
	} else {
		fmt.Println("success")
		return true
	}
}

func ResetPassword(email string) {

}

func VerifyLoginGoogle(code string) bool {
	// exchange
	form := url.Values{}
	form.Set("client_id", os.Getenv("GOOGLE_CLIENT_ID"))
	form.Set("client_secret", os.Getenv("GOOGLE_CLIENT_SECRET"))
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", "http://localhost:3000")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", form)
	if err != nil || resp.StatusCode != 200 {
		gologs.Error.Println("Something wrong with user's google code")
		return false
	}
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	json.NewDecoder(resp.Body).Decode(&tok)
	resp.Body.Close()

	// user info
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	resp, err = http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != 200 {
		gologs.Error.Println("Something wrong with user info")
		return false
	}
	defer resp.Body.Close()
	user, _ := io.ReadAll(resp.Body)

	_ = user

	return true
}

func VerifyRecaptcha(token string) bool {
	ctx := context.Background()

	// Create client
	client, err := recaptcha.NewClient(ctx, option.WithCredentialsFile("./aichat-golang-google.json"))
	if err != nil {
		gologs.Error.Println("failed to create client: %w", err)
		return false
	}
	defer client.Close()

	// Create assessment request
	request := &recaptchapb.CreateAssessmentRequest{
		Parent: fmt.Sprintf("projects/%s", "aichat-golang"),
		Assessment: &recaptchapb.Assessment{
			Event: &recaptchapb.Event{
				Token:   token,
				SiteKey: google_recaptcha_site,
			},
		},
	}

	// Call the API
	response, err := client.CreateAssessment(ctx, request)
	if err != nil {
		gologs.Error.Println("assessment failed: %w", err)
		return false
	}

	// Check if token is valid
	if !response.TokenProperties.Valid {
		gologs.Error.Println("invalid token: ", response.TokenProperties.InvalidReason)
		return false
	}

	// Return success and risk score
	return true
}
