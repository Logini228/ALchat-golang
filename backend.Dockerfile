FROM golang:1.24-alpine AS builder
WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

# Copy all root backend files
COPY main.go ./
COPY server.go ./
COPY gocode/ ./gocode/
COPY gologs/ ./gologs/

# Build complete directory context
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.19
WORKDIR /app
COPY --from=builder /app/main .
EXPOSE 8080
CMD ["./main"]