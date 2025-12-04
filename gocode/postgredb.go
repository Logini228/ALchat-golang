package gocode

import (
	"aichat/gologs"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
)

var db *sql.DB
var user, password, dbname, host, port string

func DBconnect() {
	connStr := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
		user, password, dbname, host, port)

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		gologs.Error.Println("Failed to open database:", err)
	}

	if err = db.Ping(); err != nil {
		gologs.Error.Println("Failed to connect to database:", err)
	}

	gologs.Info.Println("Successfully connected to the database!")
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
		gologs.Error.Println(err)
	}

	gologs.Info.Println("New record ID:", id)
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
		gologs.Error.Println("database connection is nil")
	}

	sqlStatement := `
    SELECT uuid FROM users
	WHERE email = ($1) AND password = ($2)`

	var uuid string
	err := db.QueryRow(sqlStatement, email, password).Scan(&uuid)
	if err != nil {
		gologs.Error.Println("wrong email or password")
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
		gologs.Error.Println("email occupied")
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
		gologs.Error.Println("couldnt register")
	}

	return true
}

func InsertModelEntry(entry ModelEntry) error {
	if db == nil {
		gologs.Error.Println("database connection is nil")
	}

	_, err := db.Exec(`
        INSERT INTO models (
            aggregator, provider, id, name, price, created, context, inputs, outputs, original
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id) DO NOTHING;
    `,
		entry.Aggregator,
		entry.Provider,
		entry.ID,
		entry.Name,
		pq.Array(entry.Price),
		entry.Created,
		entry.Context,
		pq.Array(entry.Inputs),
		pq.Array(entry.Outputs),
		entry.Original,
	)
	return err
}
