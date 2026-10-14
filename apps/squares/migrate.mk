MIGRATE    := go run -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.19.1
MIGRATIONS := internal/migrations

.PHONY: migrate-create
migrate-create: ## Create a new migration pair (NAME=add_thing)
	$(MIGRATE) create -ext sql -dir $(MIGRATIONS) -seq $(NAME)

.PHONY: migrate-up
migrate-up: ## Apply migrations (DATABASE_URL must set search_path to the service schema)
	$(MIGRATE) -path $(MIGRATIONS) -database "$(DATABASE_URL)" up

.PHONY: migrate-down
migrate-down: ## Roll back the last migration
	$(MIGRATE) -path $(MIGRATIONS) -database "$(DATABASE_URL)" down 1
