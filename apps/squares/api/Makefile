.DEFAULT_GOAL := help

# overridable so CI can drive cross-compiles and race runs without forking the recipes
SERVICES    := contests games accounts realtime
SERVICE     ?= contests
BIN_DIR     ?= bin
OUT         ?= $(BIN_DIR)/$(SERVICE)
COVER_FILE  ?= coverage.out
COVER_TOOL  ?= github.com/vladopajic/go-test-coverage/v2@v2.18.8
SWAG        := go run github.com/swaggo/swag/cmd/swag@v1.16.6
MOCKERY     := go run github.com/vektra/mockery/v2@v2.53.4
MIGRATE     := go run -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.19.1
MIGRATIONS  = internal/$(SERVICE)/migrations
RACE        ?=
BUILD_FLAGS ?=
LDFLAGS     ?=

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: run
run: ## Run one service locally (SERVICE=contests|games|accounts|realtime)
	go run ./cmd/$(SERVICE)

.PHONY: build
build: ## Build one service binary (SERVICE=contests|games|accounts|realtime)
	@mkdir -p $(dir $(OUT))
	go build $(BUILD_FLAGS) $(if $(LDFLAGS),-ldflags="$(LDFLAGS)",) -o $(OUT) ./cmd/$(SERVICE)

.PHONY: build-all
build-all: ## Build every service binary into bin/
	@for svc in $(SERVICES); do $(MAKE) --no-print-directory build SERVICE=$$svc OUT=$(BIN_DIR)/$$svc || exit 1; done

.PHONY: verify
verify: ## Verify go module dependencies
	go mod verify

.PHONY: vet
vet: ## Run go vet
	go vet ./...

.PHONY: test
test: ## Run unit tests
	go test $(RACE) ./internal/... ./cmd/...

.PHONY: test-integration
test-integration: ## Run integration tests (requires Docker)
	go test $(RACE) ./test/integration/...

.PHONY: test-all
test-all: ## Run all tests
	go test $(RACE) ./...

.PHONY: cover
cover: ## Run unit tests with coverage and enforce the threshold
	go test $(RACE) -coverprofile=$(COVER_FILE) ./internal/... ./cmd/...
	go run $(COVER_TOOL) --config .testcoverage.yml

.PHONY: cover-html
cover-html: ## Generate an HTML coverage report from the coverage profile
	go tool cover -html=$(COVER_FILE) -o coverage.html

.PHONY: lint
lint: ## Run golangci-lint
	golangci-lint run

.PHONY: fmt
fmt: ## Format all Go files
	gofmt -w .

.PHONY: mocks
mocks: ## Regenerate testify mocks
	$(MOCKERY)

.PHONY: migrate-create
migrate-create: ## Create a new migration pair for SERVICE (NAME=add_thing)
	$(MIGRATE) create -ext sql -dir $(MIGRATIONS) -seq $(NAME)

.PHONY: migrate-up
migrate-up: ## Apply migrations
	$(MIGRATE) -path $(MIGRATIONS) -database "$(DATABASE_URL)" up

.PHONY: migrate-down
migrate-down: ## Roll back the last migration
	$(MIGRATE) -path $(MIGRATIONS) -database "$(DATABASE_URL)" down 1

.PHONY: swag
swag: ## Regenerate swagger docs for every service
	@for svc in $(SERVICES); do 		$(SWAG) init --quiet -g main.go -d ./cmd/$$svc,./internal/$$svc/handler,./internal/model,./internal/platform/server 			--instanceName $$svc -o docs/$$svc || exit 1; 	done

.PHONY: swag-check
swag-check: swag ## Fail if committed swagger docs are out of date
	git diff --exit-code docs

.PHONY: tidy
tidy: ## Tidy go modules
	go mod tidy

.PHONY: deps
deps: ## Upgrade dependencies and tidy
	go get -u -t ./...
	go mod tidy

.PHONY: nats
nats: ## Port-forward a NATS server for local dev
	while true; do kubectl port-forward svc/nats 4222:4222 -n nats; done

.PHONY: redis
redis: ## Port-forward the redis primary for local dev
	while true; do kubectl port-forward svc/redis 6379:6379 -n redis; done

.PHONY: clean
clean: ## Remove build and coverage artifacts
	rm -rf $(BIN_DIR) $(COVER_FILE) coverage.html
