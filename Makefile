.PHONY: build up down restart logs ps clean stop start dev migrate seed

# Default target
all: up

# Build all containers
build:
	docker compose build

# Start all containers
up:
	docker compose up -d

# Stop and remove all containers
down:
	docker compose down

# Restart all containers
restart:
	docker compose restart

# View logs
logs:
	docker compose logs -f

# View running containers
ps:
	docker compose ps

# Clean volumes
clean:
	docker compose down -v

# Stop containers
stop:
	docker compose stop

# Start containers
start:
	docker compose start

# Run development mode
dev:
	docker compose up

# Run database migrations
migrate:
	docker compose exec backend pnpm --filter backend db:migrate

# Run database seed
seed:
	docker compose exec backend pnpm --filter backend db:seed

# Initialize database (migrate and seed)
init-db:
	docker compose --profile db-init up db-init