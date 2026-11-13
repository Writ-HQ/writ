# syntax=docker/dockerfile:1

FROM golang:1.26-alpine AS build
WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/ ./cmd/server ./cmd/migrate

# Amazon RDS certificates are signed by Amazon's own RDS authorities, which
# are not in the public trust store. The bundle lets the API verify the
# database's certificate (sslmode=verify-full with
# sslrootcert=/etc/ssl/rds/global-bundle.pem). It is unused locally.
FROM alpine:3.22 AS rds-ca
RUN wget -qO /global-bundle.pem https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
    && grep -q "BEGIN CERTIFICATE" /global-bundle.pem

# Distroless static: no shell, no package manager, runs as UID 65532.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
# Applies database migrations; a deploy runs it before starting the server.
COPY --from=build /out/migrate /migrate
COPY --from=rds-ca /global-bundle.pem /etc/ssl/rds/global-bundle.pem
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/server"]
