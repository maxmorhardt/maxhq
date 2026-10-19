FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS build

ARG SERVICE
ARG TARGETOS
ARG TARGETARCH

RUN apk add --no-cache make

WORKDIR /src

# module files first, so dependency downloads are cached until they change
COPY libs/platform/go.mod libs/platform/go.sum libs/platform/
COPY libs/squares/go.mod libs/squares/go.sum libs/squares/
COPY apps/squares/${SERVICE}/go.mod apps/squares/${SERVICE}/go.sum apps/squares/${SERVICE}/
WORKDIR /src/apps/squares/${SERVICE}
RUN GOWORK=off go mod download

WORKDIR /src
COPY libs libs
COPY apps/squares/service.mk apps/squares/migrate.mk apps/squares/
COPY apps/squares/${SERVICE} apps/squares/${SERVICE}

WORKDIR /src/apps/squares/${SERVICE}
ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN make build OUT=bin/service BUILD_FLAGS="-a" LDFLAGS="-s -w"

FROM alpine:3.24

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
