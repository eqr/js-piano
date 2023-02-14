deploy:
	docker build -t ear-trainer:latest .
	docker stop ear-trainer
	docker rm ear-trainer
	docker run -d --restart=always -p 8080:8080 --name ear-trainer ear-trainer:latest
