#!/bin/bash
cd "$(dirname "$0")"
set -a
source .env
set +a
cd backend
python3 -m uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
