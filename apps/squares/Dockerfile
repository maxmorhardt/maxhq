FROM --platform=$BUILDPLATFORM golang:1.27-alpine AS build

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

FROM gcr.io/distroless/static-debian13:nonroot

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
