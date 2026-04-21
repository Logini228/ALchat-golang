package gocode

import (
	"aichat/gologs"
	"fmt"

	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"
)

var db *sqlx.DB
var user, password, dbname, host, port string

func DBconnect() {
	connStr := fmt.Sprintf("user=%s password=%s dbname=%s host=%s port=%s sslmode=disable",
		user, password, dbname, host, port)

	var err error
	// sqlx.Connect does Open and Ping in one go
	db, err = sqlx.Connect("postgres", connStr)

	if err != nil {
		gologs.Error.Println("Failed to connect to database:", err)
		return
	}

	gologs.Info.Println("Successfully connected to the database with sqlx!")
}

func CloseDB() {
	if db != nil {
		db.Close()
	}
}

func InsertChatData(chatid string, sender string, sender_user bool, message string) string {
	if db == nil {
		gologs.Error.Println("database connection is nil")
	}
	if chatid == "0" {
		return ""
	}

	if message == "" {
		return ""
	}

	sqlStatement := `
        INSERT INTO message (chatid, sender, sender_user, message)
        VALUES ($1, $2, $3, $4)
        RETURNING id, mess_uuid`

	var id int
	var mess_uuid string
	err := db.QueryRow(sqlStatement, chatid, sender, sender_user, message).Scan(&id, &mess_uuid)
	if err != nil {
		gologs.Error.Println("Error inserting into db: ", err)
	}

	gologs.Info.Println("New record ID:", id)
	return mess_uuid
}

type ChatMessage struct {
	MessUUID   string `json:"mess_uuid"`
	Sender     string `json:"sender"`
	SenderUser bool   `json:"sender_user"`
	Message    string `json:"message"`
}

func QueryChatMessages(chatid string) ([]ChatMessage, bool) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return nil, false
	}

	sqlStatement := `
		SELECT sender, sender_user, message, mess_uuid 
		FROM message 
		WHERE chatid=$1 
		ORDER BY id ASC;
	`

	rows, err := db.Query(sqlStatement, chatid)
	if err != nil {
		gologs.Error.Printf("Error retrieving chat id %s: %v", chatid, err)
		return nil, false
	}
	defer rows.Close()

	messages := []ChatMessage{}

	for rows.Next() {
		var m ChatMessage
		if err := rows.Scan(&m.Sender, &m.SenderUser, &m.Message, &m.MessUUID); err != nil {
			gologs.Error.Println("Scan error:", err)
			return nil, false
		}
		messages = append(messages, m)
	}

	if err := rows.Err(); err != nil {
		gologs.Error.Println("Rows iteration error:", err)
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
			AND $2 = ANY(jtis))`

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

func QueryUserChatList(uuid string) ([]ChatSummary, bool) {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return nil, false
	}

	sqlStatement := `
    SELECT c.chatid, c.chatname
	FROM chat c
	JOIN chat_members m ON m.chatid = c.chatid
	WHERE m.uuid = $1
	ORDER BY c.created_at DESC;`

	rows, err := db.Query(sqlStatement, uuid)
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

	if err := rows.Err(); err != nil {
		gologs.Error.Println("Error during row iteration: ", err)
		return nil, false
	}

	return chatList, true
}

func CreateChatDB(uuid string, chatid string) bool {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return false
	}

	tx, err := db.Begin()
	if err != nil {
		gologs.Error.Println("could not start transaction:", err)
		return false
	}

	_, err = tx.Exec(`INSERT INTO chat (chatid) VALUES ($1)`, chatid)
	if err != nil {
		tx.Rollback() // Cancel everything if this fails
		gologs.Error.Println("error inserting into chat:", err)
		return false
	}

	_, err = tx.Exec(`INSERT INTO chat_members (uuid, chatid) VALUES ($1, $2)`, uuid, chatid)
	if err != nil {
		tx.Rollback()
		gologs.Error.Println("error inserting into chat_members:", err)
		return false
	}

	if err := tx.Commit(); err != nil {
		gologs.Error.Println("could not commit transaction:", err)
		return false
	}

	return true
}

func CanAccessChat(uuid string, chatid string) bool {
	if db == nil {
		gologs.Error.Println("database connection is nil")
		return false
	}

	sqlStatement := `
		SELECT EXISTS (
			SELECT FROM chat_members
		WHERE
			uuid = $1
		AND
			chatid = $2
		)`

	var verified bool
	err := db.QueryRow(sqlStatement, uuid, chatid).Scan(&verified)
	if err != nil {
		gologs.Warning.Println("user to chat verification failed:", err)
		return false
	}

	return verified
}

type MessageData struct {
	Message    string `db:"message"`
	Sender     string `db:"sender"`
	SenderUser bool   `db:"sender_user"`
}

type Row struct {
	UUID string `db:"mess_uuid"`
	MessageData
}

func messUUIDsToContent(ids []string) map[string]MessageData {
	if db == nil || len(ids) == 0 {
		return nil
	}

	query, args, err := sqlx.In("SELECT mess_uuid, message, sender, sender_user FROM message WHERE mess_uuid IN (?)", ids)
	if err != nil {
		gologs.Error.Println("query construction error:", err)
		return nil
	}
	query = db.Rebind(query)

	type Row struct {
		UUID string `db:"mess_uuid"`
		MessageData
	}
	var results []Row

	err = db.Select(&results, query, args...)
	if err != nil {
		gologs.Error.Println("db-related error:", err)
		return nil
	}

	contents := make(map[string]MessageData, len(results))
	for _, r := range results {
		contents[r.UUID] = r.MessageData
	}

	return contents
}
