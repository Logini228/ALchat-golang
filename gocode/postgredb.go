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
	if db == nil {
		gologs.Error.Println("database connection is nil")
	}
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
		gologs.Error.Println("Error inserting into db: ", err)
	}

	gologs.Info.Println("New record ID:", id)
}

type ChatMessage struct {
	MessUUID string `json:"mess_uuid"`
	Sender   string `json:"sender"`
	Message  string `json:"message"`
}

func QueryChatData(chatid string, requestingUserUUID string) ([]ChatMessage, bool) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return nil, false
	}

	var exists bool
	err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM chat_members WHERE chatid=$1 AND user_uuid=$2)",
		chatid, requestingUserUUID).Scan(&exists)

	if err != nil || !exists {
		gologs.Error.Println("Unauthorized access attempt or error")
		return nil, false
	}

	// 2. If authorized, get the messages
	rows, err := db.Query("SELECT sender_name, message, mess_uuid FROM chat WHERE chatid=$1 ORDER BY id ASC;", chatid)
	// ... rest of your loop
	if err != nil {
		gologs.Error.Println("Error retrieving chat id: ", chatid, " with error: ", err)
		return nil, false
	}
	defer rows.Close()

	var messages []ChatMessage

	for rows.Next() {
		var m ChatMessage

		err = rows.Scan(&m.Sender, &m.Message, &m.MessUUID)
		if err != nil {
			gologs.Error.Println("Scan error:", err)
			return nil, false
		}

		messages = append(messages, m)
	}

	if err = rows.Err(); err != nil {
		return nil, false
	}

	return messages, true
}

func LoginWithDB(email string, password string) string {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return ""
	}

	sqlStatement := `
    SELECT uuid, password_hash 
	FROM users
	WHERE email = $1`

	var uuid string
	var password_hash string
	err := db.QueryRow(sqlStatement, email).Scan(&uuid, &password_hash)
	if err != nil {
		gologs.Warning.Println("Authentication failed:", err)
		return ""
	}

	if !CheckPassword(password, password_hash) {
		gologs.Warning.Println("Password mismatch for email:", email)
		return ""
	}

	return uuid
}

func GoogleToDB(user *GoogleUser) (string, string) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return "", ""
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
		return false
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
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING uuid`

	password_hash := HashPassword(password)
	if password_hash == "" {
		gologs.Warning.Println("error hashing password at email: ", email)
		return false
	}

	err2 := db.QueryRow(sqlStatement, email, password_hash).Scan(&uuid)
	if err2 != nil {
		gologs.Error.Println("couldnt register at email: ", email)
	}

	return true
}

func InsertJTI(jti string, uuid string) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return
	}

	if uuid == "" {
		gologs.Error.Println("uuid is null")
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

func VerifyJTI(jti string, uuid string) bool {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return false
	}

	// Check if the JTI exists in the user's jtis column
	// Returns true if found, false if not
	sqlStatement := `
		SELECT EXISTS(
			SELECT 1 
			FROM users 
			WHERE uuid = $1 
			AND $2 = ANY(jtis) 
		)`

	var verified bool
	err := db.QueryRow(sqlStatement, uuid, jti).Scan(&verified)
	if err != nil {
		gologs.Warning.Println("JTI verification failed:", err)
		return false
	}

	return verified
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
	return results, nil
}

func QueryUser(uuid string) (string, string) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return "", ""
	}

	sqlStatement := `
		SELECT 
			COALESCE(name, ''), 
			COALESCE(avatar, ''), 
			email
		FROM users
		WHERE uuid = $1`

	var name string
	var avatar string
	var email string

	err := db.QueryRow(sqlStatement, uuid).Scan(&name, &avatar, &email)
	if err != nil {
		gologs.Warning.Println("Query user failed:", err)
		return "", ""
	}

	if name == "" {
		return email, avatar
	}
	return name, avatar
}

type ChatSummary struct {
	ChatID   string `json:"chat_id"`
	ChatName string `json:"chat_name"`
}

func QueryUserChatList(userUUID string) ([]ChatSummary, bool) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return nil, false
	}

	query := `
        SELECT s.chatid, s.chatname
        FROM chat_members m
        JOIN chat_sessions s ON m.chatid = s.chatid
        LEFT JOIN chat c ON s.chatid = c.chatid
        WHERE m.user_uuid = $1
        GROUP BY s.chatid, s.chatname
        ORDER BY MAX(c.created_at) DESC NULLS LAST;`

	rows, err := db.Query(query, userUUID)
	if err != nil {
		gologs.Error.Println("got error when querying chatlist: ", err)
		return nil, false
	}
	defer rows.Close()

	var chatList []ChatSummary
	for rows.Next() {
		var cs ChatSummary
		if err := rows.Scan(&cs.ChatID, &cs.ChatName); err != nil {
			gologs.Error.Println("Error getting chatlist: ", err)
			return nil, false
		}
		chatList = append(chatList, cs)
	}

	return chatList, true
}
