#!/bin/bash
cd "$(dirname "$0")"
set -a
source .env
set +a
cd backend
python3 -m uvicorn app.main:app --reload --port 8000
