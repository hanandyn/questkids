#!/bin/bash
# QuestKids one-click deploy script
# Usage: ./deploy.sh [up|down|restart|logs]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

COMMAND=${1:-up}

case "$COMMAND" in
  up)
    info "Setting up QuestKids..."

    # Check for .env
    if [ ! -f .env ]; then
      info "No .env file found. Creating from .env.example..."
      cp .env.example .env
      success "Created .env — please edit it with your settings!"
      echo ""
      echo "  ⚠️  IMPORTANT: Edit .env and change SECRET_KEY before proceeding!"
      echo "  Run ./deploy.sh up again after editing."
      echo ""
      exit 0
    fi

    # Check if SECRET_KEY is still default
    if grep -q "change-this-to-a-random-secret-string" .env; then
      error "SECRET_KEY is still the default value! Edit .env and change it."
      exit 1
    fi

    # Start services
    info "Building and starting containers..."
    docker compose up -d --build

    # Wait for health checks
    info "Waiting for services to be healthy..."
    sleep 5

    # Check backend health
    if command -v curl &> /dev/null; then
      if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1; then
        success "Backend is healthy!"
      else
        error "Backend health check failed. Check logs with: ./deploy.sh logs backend"
      fi
    fi

    echo ""
    echo "  ✅ QuestKids is running!"
    echo "  Frontend:  http://localhost:${FRONTEND_PORT:-80}"
    echo "  Backend:   http://localhost:8000"
    echo "  API Docs:  http://localhost:8000/docs"
    echo ""
    ;;

  down)
    info "Stopping QuestKids..."
    docker compose down
    success "Stopped."
    ;;

  restart)
    info "Restarting QuestKids..."
    docker compose restart
    success "Restarted."
    ;;

  logs)
    docker compose logs -f ${2:-}
    ;;

  *)
    echo "Usage: ./deploy.sh [up|down|restart|logs]"
    echo ""
    echo "  up      — Start QuestKids (builds if needed)"
    echo "  down    — Stop QuestKids"
    echo "  restart — Restart all services"
    echo "  logs    — View logs (optionally: logs [service])"
    exit 1
    ;;
esac
