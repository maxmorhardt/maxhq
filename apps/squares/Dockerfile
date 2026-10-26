FROM --platform=$BUILDPLATFORM golang:1.27-alpine@sha256:b8c9b82affbbb82a020bbcf998dad2ba9516944ac7e883524642a481a9505e9c AS build

ARG SERVICE
ARG TARGETOS
ARG TARGETARCH

RUN apk add --no-cache make

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY libs libs
COPY apps/squares/service.mk apps/squares/migrate.mk apps/squares/
COPY apps/squares/${SERVICE} apps/squares/${SERVICE}

WORKDIR /src/apps/squares/${SERVICE}
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN make build OUT=bin/service BUILD_FLAGS="-a" LDFLAGS="-s -w"

FROM alpine:3.24@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a

ARG SERVICE

LABEL io.maxhq.image.source="https://github.com/maxmorhardt/maxhq/tree/main/apps/squares/${SERVICE}"
LABEL io.maxhq.image.description="Squares ${SERVICE} service"
LABEL io.maxhq.image.vendor="Max Morhardt"
LABEL io.maxhq.image.licenses="PolyForm-Noncommercial-1.0.0"

ENV GIN_MODE="release"

WORKDIR /app

RUN addgroup -g 1000 squares && \
    adduser -D -u 1000 -G squares squares

COPY --from=build --chown=squares:squares /src/apps/squares/${SERVICE}/bin/service ./service

RUN apk upgrade --no-cache && \
    apk add --no-cache ca-certificates && \
    chmod +x service

USER squares

EXPOSE 8080

CMD ["./service"]
