# Stage 1: Build the single executable binary
FROM oven/bun:1.3.3-alpine AS builder

WORKDIR /app

# Copy the entire monorepo so bun has full workspace context
COPY . .

# Install all dependencies (full monorepo)
RUN bun install

# Compile the app into a single executable binary
RUN bun build --compile apps/playground-playgroup-swap/src/main.ts --outfile main

# Stage 2: Minimal runtime with the binary
FROM alpine:3.23

RUN apk add --no-cache ca-certificates libstdc++ libgcc

COPY --from=builder /app/main /app/main

EXPOSE 80

CMD ["/app/main"]
