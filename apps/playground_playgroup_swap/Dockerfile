FROM oven/bun:1.3.3-alpine

# Install Tailscale
RUN apk add --no-cache ca-certificates iptables iproute2 ip6tables tailscale

# Create app directory
WORKDIR /app

# Copy relevant directories from monorepo root
COPY package.json bun.lock ./
COPY apps/playground_playgroup_swap/package.json ./apps/playground_playgroup_swap/

# Install dependencies only for this app using --filter
RUN bun install --filter 'playground_playgroup_swap' --production

# Copy app source
COPY apps/playground_playgroup_swap ./apps/playground_playgroup_swap/

# Build TypeScript
WORKDIR /app/apps/playground_playgroup_swap
RUN bun run build

# Copy startup script
COPY apps/playground_playgroup_swap/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
