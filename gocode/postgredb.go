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

func InsertChatData(chatid string, sender string, message string) {
	if chatid == "0" {
		return
	}

	if message == "" {
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

func GoogleToDB(user *GoogleUser) (string, string) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
	}
	var uuid string
	err := db.QueryRow(`
    INSERT INTO users (
        email, googleid, name, avatar
    ) VALUES (
        $1, $2, $3, $4
    )
    ON CONFLICT (googleid) DO NOTHING
    RETURNING uuid
`,
		user.Email,
		user.ID,
		user.Name,
		user.Avatar,
	).Scan(&uuid)
	if err != nil {
		gologs.Error.Printf("couldn't insert google user entry, %v", err)
	}

	return uuid, user.Email
}

func RegisterWithDB(email string, password string) bool {
	if db == nil {
		gologs.Error.Println("database connection is nil")
	}
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

func InsertJTI(jti string, uuid string) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return
	}

	sqlStatement := `
    	UPDATE users
		SET jtis = array_append(jtis, $1)
		WHERE uuid = $2;`

	result, err := db.Exec(sqlStatement, jti, uuid)
	if err != nil {
		gologs.Error.Printf("couldn't insert jti: %v", err)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		gologs.Error.Printf("error inserting jti, checking rows affected: %v", err)
	} else if rowsAffected == 0 {
		gologs.Warning.Printf("couldn't insert jti to user with uuid: %s", uuid)
	}
}

func InsertModelEntry(entry ModelEntry) {
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

	if err != nil {
		gologs.Error.Printf("couldn't insert model entry, %v", err)
	}
}

func QueryModels(query string) ([]ModelEntry, error) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
	}
	rows, err := db.Query(`
	SELECT 
		aggregator, provider, id, name, 
		price, context, 
		inputs, outputs
	FROM models 
	WHERE 
		name ILIKE '%' || $1 || '%' OR 
		id ILIKE '%' || $1 || '%'
	ORDER BY created DESC
	`, query)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []ModelEntry
	for rows.Next() {
		var entry ModelEntry

		err := rows.Scan(
			&entry.Aggregator,
			&entry.Provider,
			&entry.ID,
			&entry.Name,
			pq.Array(&entry.Price),
			&entry.Context,
			pq.Array(&entry.Inputs),
			pq.Array(&entry.Outputs),
		)
		if err != nil {
			return nil, err
		}

		results = append(results, entry)
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}
	fmt.Printf("returning %v results", len(results))
	return results, nil
}
