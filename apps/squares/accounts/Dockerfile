# built from the repository root so the shared libs are in the context:
#   docker build -f apps/squares/accounts/Dockerfile .
FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS build

ARG TARGETOS
ARG TARGETARCH

RUN apk add --no-cache make

WORKDIR /src

# module files first, so dependency downloads are cached until they change
COPY libs/platform/go.mod libs/platform/go.sum libs/platform/
COPY libs/squares/go.mod libs/squares/go.sum libs/squares/
COPY apps/squares/accounts/go.mod apps/squares/accounts/go.sum apps/squares/accounts/
RUN cd apps/squares/accounts && GOWORK=off go mod download

COPY libs libs
COPY apps/squares/accounts apps/squares/accounts

WORKDIR /src/apps/squares/accounts
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN make build OUT=bin/service BUILD_FLAGS="-a" LDFLAGS="-s -w"

FROM alpine:latest

LABEL io.maxstash.image.source="https://github.com/maxmorhardt/maxstash/tree/main/apps/squares/accounts"
LABEL io.maxstash.image.description="Squares accounts service"
LABEL io.maxstash.image.vendor="Max Morhardt"
LABEL io.maxstash.image.licenses="PolyForm-Noncommercial-1.0.0"

ENV GIN_MODE="release"

WORKDIR /app

RUN addgroup -g 1000 squares && \
    adduser -D -u 1000 -G squares squares

COPY --from=build --chown=squares:squares /src/apps/squares/accounts/bin/service ./service

RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    chmod +x service

USER squares

EXPOSE 8080

CMD ["./service"]
