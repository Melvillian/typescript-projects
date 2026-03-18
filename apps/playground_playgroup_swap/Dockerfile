# Stage 1: Build the single executable binary
FROM oven/bun:1.3-alpine AS builder

WORKDIR /app

# Copy the entire monorepo so bun has full workspace context
COPY . .

# Install all dependencies (full monorepo)
RUN bun install

# Compile the app into a single executable binary
RUN bun build --compile apps/playground_playgroup_swap/src/server.ts --outfile server

# Stage 2: Minimal runtime with Tailscale + the binary
FROM alpine:3.23

RUN apk add --no-cache ca-certificates iptables iproute2 ip6tables tailscale libstdc++ libgcc

COPY --from=builder /app/server /app/server
COPY apps/playground_playgroup_swap/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
