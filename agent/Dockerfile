FROM python:3.11-slim

WORKDIR /app

RUN pip install websockets psutil requests python-dotenv

COPY agent.py .

CMD ["python", "-u", "agent.py"]