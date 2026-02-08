#!/bin/sh

# Start Tailscale daemon in the background
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

# Wait for tailscaled to start
sleep 2

# Authenticate with Tailscale
tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname="${TAILSCALE_HOSTNAME:-render-endpoint}" --accept-routes

# Start the server
exec /app/server
