FROM golang:latest
WORKDIR /app
COPY go.mod ./
# COPY go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o app .

FROM alpine:latest
WORKDIR /app
COPY ./static/ /app/static/
COPY --from=0 /app/app /app/
CMD ["./app"]
