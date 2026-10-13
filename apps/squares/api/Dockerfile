FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS build

ARG TARGETOS
ARG TARGETARCH
# which service this image runs: contests, games, accounts, or realtime
ARG SERVICE

RUN apk add --no-cache make

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN test -n "$SERVICE" && make build SERVICE="$SERVICE" OUT=bin/service BUILD_FLAGS="-a" LDFLAGS="-s -w"

FROM alpine:latest

ARG SERVICE

LABEL io.maxstash.image.source="https://github.com/maxmorhardt/maxstash/tree/main/apps/squares/api"
LABEL io.maxstash.image.description="Squares ${SERVICE} service"
LABEL io.maxstash.image.vendor="Max Morhardt"
LABEL io.maxstash.image.licenses="PolyForm-Noncommercial-1.0.0"

ENV GIN_MODE="release"

WORKDIR /app

RUN addgroup -g 1000 squares && \
    adduser -D -u 1000 -G squares squares

COPY --from=build --chown=squares:squares /src/bin/service ./service

RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    chmod +x service

USER squares

EXPOSE 8080

CMD ["./service"]
