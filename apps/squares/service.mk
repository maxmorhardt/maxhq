.DEFAULT_GOAL := help

BIN_DIR     ?= bin
OUT         ?= $(BIN_DIR)/$(SERVICE)
COVER_FILE  ?= coverage.out
COVER_TOOL  ?= github.com/vladopajic/go-test-coverage/v2@v2.18.8
SWAG        := go run github.com/swaggo/swag/cmd/swag@v1.16.6
MOCKERY     := go run github.com/vektra/mockery/v2@v2.53.4
RACE        ?=
BUILD_FLAGS ?=
LDFLAGS     ?=

ifneq ($(wildcard internal/migrations),)
include $(dir $(lastword $(MAKEFILE_LIST)))migrate.mk
endif

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: run
run: ## Run the service locally (reads .env)
	go run ./cmd/$(SERVICE)

.PHONY: build
build: ## Build the service binary
	@mkdir -p $(dir $(OUT))
	go build $(BUILD_FLAGS) $(if $(LDFLAGS),-ldflags="$(LDFLAGS)",) -o $(OUT) ./cmd/$(SERVICE)

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
test-integration: ## Run integration and smoke tests (requires Docker); CI runs this
	go test $(RACE) ./test/...

.PHONY: test-smoke
test-smoke: ## Build the binary, start it against Postgres and Valkey, and check it comes up (requires Docker)
	go test $(RACE) ./test/smoke/...

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

.PHONY: swag
swag: ## Regenerate the swagger docs
	$(SWAG) init --quiet -g main.go -d ./cmd/$(SERVICE),./internal/handler,../../../libs/platform/server \
		--parseDependency --instanceName $(SERVICE) -o docs

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

.PHONY: clean
clean: ## Remove build and coverage artifacts
	rm -rf $(BIN_DIR) $(COVER_FILE) coverage.html
