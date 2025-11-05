package gocode

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

var db *sql.DB

func DBconnect() {
	// Connection string
	connStr := "user=postgres dbname=postgres sslmode=disable password=admin1"

	// Open a database connection
	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	// Remove defer db.Close() - keep connection open for global use

	// Verify the connection
	err = db.Ping()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("Successfully connected to the database!")
}

func CloseDB() {
	if db != nil {
		db.Close()
	}
}

func InsertChatData(chatid string, sender string, message []byte) {
	if chatid == "0" {
		return
	}

	sqlStatement := `
        INSERT INTO chat (chatid, sender, message)
        VALUES ($1, $2, $3)
        RETURNING id`

	var id int
	err := db.QueryRow(sqlStatement, chatid, sender, message).Scan(&id)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("New record ID:", id)
}

func QueryChatData(chatid string) ([]string, error) {
	rows, err := db.Query("SELECT message FROM chat WHERE chatid=$1;", chatid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var messages []string
	for rows.Next() {
		var message string
		err = rows.Scan(&message)
		if err != nil {
			return nil, err
		}
		messages = append(messages, message)
	}

	return messages, rows.Err()
}

func LoginWithDB(email string, password string) string {
	if db == nil {
		log.Fatal("database connection is nil")
	}

	sqlStatement := `
    SELECT uuid FROM users
	WHERE email = ($1) AND password = ($2)`

	var uuid string
	err := db.QueryRow(sqlStatement, email, password).Scan(&uuid)
	if err != nil {
		fmt.Println("wrong email or password")
	}

	return uuid
}

func RegisterWithDB(email string, password string) bool {

	sqlStatementCheck := `
    SELECT uuid FROM users
	WHERE email = ($1)`

	var uuid string
	err := db.QueryRow(sqlStatementCheck, email).Scan(&uuid)
	if err == nil {
		fmt.Println("email occupied")
	}

	if uuid != "" {
		return false
	}

	sqlStatement := `
        INSERT INTO users (email, password)
        VALUES ($1, $2)
        RETURNING uuid`

	err2 := db.QueryRow(sqlStatement, email, password).Scan(&uuid)
	if err2 != nil {
		fmt.Println("couldnt register")
	}

	return true
}
