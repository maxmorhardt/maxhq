.DEFAULT_GOAL := help

COMPOSE := docker compose -f compose.yaml

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-10s %s\n", $$1, $$2}'

.PHONY: up
up: ## Build and start Postgres, Valkey, the four services, and the gateway on :8080
	$(COMPOSE) up -d --build

.PHONY: web
web: ## Run the web app on :3000 against the local gateway
	cd web && pnpm install && pnpm dev

.PHONY: down
down: ## Stop everything, keeping the data
	$(COMPOSE) down

.PHONY: reset
reset: ## Stop everything and delete the Postgres and Valkey data
	$(COMPOSE) down -v

.PHONY: logs
logs: ## Follow the logs (S=contests to follow one service)
	$(COMPOSE) logs -f $(S)

.PHONY: ps
ps: ## Show what is running
	$(COMPOSE) ps
