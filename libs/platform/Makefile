.DEFAULT_GOAL := help

export GOWORK := off

COVER_FILE  ?= coverage.out
COVER_TOOL  ?= github.com/vladopajic/go-test-coverage/v2@v2.18.8
RACE        ?=

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: verify
verify: ## Verify go module dependencies
	go mod verify

.PHONY: vet
vet: ## Run go vet
	go vet ./...

.PHONY: test
test: ## Run unit tests
	go test $(RACE) ./...

.PHONY: test-integration
test-integration: ## The libraries are exercised against real containers by the services' integration tests
	@echo "no integration tests here; run the services' make test-integration"

.PHONY: cover
cover: ## Run unit tests with coverage and enforce the threshold
	go test $(RACE) -coverprofile=$(COVER_FILE) ./...
	go run $(COVER_TOOL) --config .testcoverage.yml

.PHONY: cover-html
cover-html: ## Generate an HTML coverage report from the coverage profile
	go tool cover -html=$(COVER_FILE) -o coverage.html

.PHONY: lint
lint: ## Run golangci-lint
	golangci-lint run

.PHONY: tidy
tidy: ## Tidy go modules
	go mod tidy

.PHONY: clean
clean: ## Remove coverage artifacts
	rm -f $(COVER_FILE) coverage.html
