FROM --platform=$BUILDPLATFORM golang:1.27-alpine@sha256:70bd7ddea8b6cbe5d6943cde279d6b67feb10cc924fb9100d1d8757c1575b280 AS build

ARG SERVICE
ARG TARGETOS
ARG TARGETARCH

RUN apk add --no-cache make

WORKDIR /src/${SERVICE}

COPY ${SERVICE}/go.mod ${SERVICE}/go.sum ./
RUN go mod download

COPY service.mk migrate.mk /src/
COPY ${SERVICE} .

ENV CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH
RUN make build OUT=bin/service BUILD_FLAGS="-a" LDFLAGS="-s -w"

FROM gcr.io/distroless/static-debian13:nonroot@sha256:aafe993665bf6200db38a02c11a9351e782a84b6a45e7f33b6695638c88e3931

ARG SERVICE

LABEL io.maxhq.image.source="https://github.com/maxmorhardt/maxhq/tree/main/apps/squares/${SERVICE}"
LABEL io.maxhq.image.description="Squares ${SERVICE} service"
LABEL io.maxhq.image.vendor="Max Morhardt"
LABEL io.maxhq.image.licenses="PolyForm-Noncommercial-1.0.0"

ENV GIN_MODE="release"

WORKDIR /app

COPY --from=build /src/${SERVICE}/bin/service ./service

EXPOSE 8080

ENTRYPOINT ["/app/service"]
