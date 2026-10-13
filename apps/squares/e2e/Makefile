.DEFAULT_GOAL := help

export GOWORK := off

RACE ?=

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

.PHONY: test
test: ## Build the four services and run them together (requires Docker)
	go test $(RACE) -count=1 -timeout 20m ./...

.PHONY: lint
lint: ## Run golangci-lint
	golangci-lint run

.PHONY: tidy
tidy: ## Tidy go modules
	go mod tidy
