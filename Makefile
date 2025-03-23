deploy:
	docker build -t ear-trainer:latest .
	docker stop ear-trainer
	docker rm ear-trainer
	docker run -d --restart=always -p 127.0.0.1:9004:8080 --name ear-trainer ear-trainer:latest
