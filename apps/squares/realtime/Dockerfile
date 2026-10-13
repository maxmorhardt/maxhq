# built from the repository root so the shared libs are in the context:
#   docker build -f apps/squares/realtime/Dockerfile .
FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS build

ARG TARGETOS
ARG TARGETARCH

RUN apk add --no-cache make

WORKDIR /src

# module files first, so dependency downloads are cached until they change
COPY libs/go/platform/go.mod libs/go/platform/go.sum libs/go/platform/
COPY libs/go/squares/go.mod libs/go/squares/go.sum libs/go/squares/
COPY apps/squares/realtime/go.mod apps/squares/realtime/go.sum apps/squares/realtime/
RUN cd apps/squares/realtime && GOWORK=off go mod download

COPY libs/go libs/go
COPY apps/squares/realtime apps/squares/realtime

WORKDIR /src/apps/squares/realtime
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN make build OUT=bin/service BUILD_FLAGS="-a" LDFLAGS="-s -w"

FROM alpine:latest

LABEL io.maxstash.image.source="https://github.com/maxmorhardt/maxstash/tree/main/apps/squares/realtime"
LABEL io.maxstash.image.description="Squares realtime service"
LABEL io.maxstash.image.vendor="Max Morhardt"
LABEL io.maxstash.image.licenses="PolyForm-Noncommercial-1.0.0"

ENV GIN_MODE="release"

WORKDIR /app

RUN addgroup -g 1000 squares && \
    adduser -D -u 1000 -G squares squares

COPY --from=build --chown=squares:squares /src/apps/squares/realtime/bin/service ./service

RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    chmod +x service

USER squares

EXPOSE 8080

CMD ["./service"]
