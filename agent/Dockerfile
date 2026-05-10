FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y iputils-ping && rm -rf /var/lib/apt/lists/*
RUN pip install websockets psutil requests python-dotenv

COPY agent.py .

CMD ["python", "-u", "agent.py"]