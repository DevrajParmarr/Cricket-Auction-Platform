#!/bin/sh
# Production entrypoint for hosts without a separate migration step (e.g. Render free tier)
set -e

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*'
