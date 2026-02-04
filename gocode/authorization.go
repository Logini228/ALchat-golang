package gocode

import (
	"aichat/gologs"
	"context"
	"crypto/rand"
	"encoding/hex"
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

func CreateJWT(uuid string, email string, long bool) string {
	var addTime time.Duration
	if long {
		addTime = time.Hour * 2160 // 3 months
	} else {
		addTime = time.Minute * 15 // 15 minutes
	}

	jti := generateJTI()

	// Create a new token object
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"uuid":  uuid,
		"email": email,
		"jti":   jti,
		"iat":   time.Now().Unix(),
		"exp":   time.Now().Add(addTime).Unix(),
	})

	// Sign the token with a secret key
	secretKey := []byte(jwt_secret_key)
	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		gologs.Error.Println("Error signing token:", err)
		return " "
	}

	InsertJTI(jti, uuid)

	return signedToken
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
		gologs.Error.Println("Error parsing token:", err)
		return
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		gologs.Info.Printf("Token claims: %v\n", claims)
	} else {
		gologs.Error.Println("Invalid token")
	}
}

func LoginWithCredentials(email string, password string) bool {
	if LoginWithDB(email, password) == "" {
		gologs.Error.Println("no success")
		return false
	} else {
		gologs.Info.Println("success")
		return true
	}
}

func RegisterWithCredentials(email string, password string) bool {
	if RegisterWithDB(email, password) {
		gologs.Error.Println("no success")
		return false
	} else {
		gologs.Info.Println("success")
		return true
	}
}

func ResetPassword(email string) {

}

type GoogleUser struct {
	ID     string `json:"id"` // Google's user ID
	Email  string `json:"email"`
	Name   string `json:"name"`    // This is the "login" / display name
	Avatar string `json:"picture"` // Profile picture URL
}

func VerifyLoginGoogle(code string) (*GoogleUser, bool) {
	form := url.Values{}
	form.Set("client_id", os.Getenv("GOOGLE_CLIENT_ID"))
	form.Set("client_secret", os.Getenv("GOOGLE_CLIENT_SECRET"))
	form.Set("grant_type", "authorization_code")
	form.Set("code", code)
	form.Set("redirect_uri", "http://localhost:3000")

	resp, err := http.PostForm("https://oauth2.googleapis.com/token", form)
	if err != nil || resp.StatusCode != 200 {
		gologs.Error.Println("Something wrong with user's google code")
		return nil, false
	}
	defer resp.Body.Close()

	var tokenResponse struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tokenResponse); err != nil {
		gologs.Error.Println("Failed to decode token response:", err)
		return nil, false
	}

	// Get user info
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+tokenResponse.AccessToken)
	resp, err = http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode != 200 {
		gologs.Error.Println("Something wrong with user info")
		return nil, false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		gologs.Error.Println("Failed to read user info response:", err)
		return nil, false
	}

	var user GoogleUser
	if err := json.Unmarshal(body, &user); err != nil {
		gologs.Error.Println("Failed to unmarshal user info:", err)
		return nil, false
	}

	gologs.Info.Printf("Google auth success - id: %s, email: %s, name: %s",
		user.ID, user.Email, user.Name)
	gologs.Info.Println("Raw body:", string(body))
	return &user, true
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
		gologs.Error.Printf("assessment failed: %v", err)
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

// this function I found looks like magic in a sense that I have no idea what it does
func generateJTI() string {
	b := make([]byte, 16)
	_, err := rand.Read(b)
	if err != nil {
		gologs.Error.Println("Apparently system entropy has failed")
	}
	return hex.EncodeToString(b)
}
