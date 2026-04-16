#!/bin/bash
cd "$(dirname "$0")"
set -a
source .env
set +a
python3 -m uvicorn backend.app.main:app --reload --port 8000
