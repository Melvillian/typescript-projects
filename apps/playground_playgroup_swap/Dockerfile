FROM node:22-alpine

# Install Tailscale
RUN apk add --no-cache ca-certificates iptables iproute2 ip6tables tailscale

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Build TypeScript
RUN npm run build

# Copy startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]
