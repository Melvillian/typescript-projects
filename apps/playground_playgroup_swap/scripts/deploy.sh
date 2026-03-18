#!/bin/bash
set -euo pipefail

# --- Config ---
SERVICE_NAME="playground-playgroup-swap"
TAILSCALE_HOSTNAME="playground-playgroup-swap"
REPO_URL="https://github.com/Melvillian/typescript-projects"
DOCKERFILE_PATH="apps/playground_playgroup_swap/Dockerfile"
SERVICE_TYPE="private_service"
RENDER_API="https://api.render.com/v1"
WORKSPACE_OWNER_ID="tea-cspvkb8gph6c73ft0hd0"

# --- Step 1: Validate required env vars ---
if [[ -z "${TS_AUTHKEY:-}" ]]; then
  echo "ERROR: TS_AUTHKEY is not set. Set it to a long-lived Tailscale API key."
  exit 1
fi

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: RENDER_API_KEY is not set."
  exit 1
fi

# --- Step 2: Generate ephemeral Tailscale auth key ---
echo "Generating ephemeral Tailscale auth key..."
TS_RESPONSE=$(curl -s -X POST "https://api.tailscale.com/api/v2/tailnet/-/keys" \
  -H "Authorization: Bearer ${TS_AUTHKEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "capabilities": {
      "devices": {
        "create": {
          "reusable": false,
          "ephemeral": true,
          "preauthorized": true
        }
      }
    },
    "expirySeconds": 7776000
  }')

EPHEMERAL_KEY=$(echo "$TS_RESPONSE" | jq -r '.key // empty')
if [[ -z "$EPHEMERAL_KEY" ]]; then
  echo "ERROR: Failed to generate ephemeral Tailscale key."
  echo "Response: $TS_RESPONSE"
  exit 1
fi
echo "Ephemeral Tailscale key generated."

# --- Step 3: Find or create the Render service ---
echo "Looking for existing Render service '${SERVICE_NAME}'..."
SERVICES_RESPONSE=$(curl -s "${RENDER_API}/services?name=${SERVICE_NAME}&limit=1" \
  -H "Authorization: Bearer ${RENDER_API_KEY}")

SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.[0].service.id // empty')

if [[ -z "$SERVICE_ID" ]]; then
  echo "Service not found. Creating '${SERVICE_NAME}'..."
  CREATE_RESPONSE=$(curl -s -X POST "${RENDER_API}/services" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n \
      --arg name "$SERVICE_NAME" \
      --arg repo "$REPO_URL" \
      --arg dockerfile "$DOCKERFILE_PATH" \
      --arg type "$SERVICE_TYPE" \
      --arg tsKey "$EPHEMERAL_KEY" \
      --arg tsHostname "$TAILSCALE_HOSTNAME" \
      --arg ownerId "$WORKSPACE_OWNER_ID" \
      '{
        type: $type,
        name: $name,
        ownerId: $ownerId,
        repo: $repo,
        autoDeploy: "yes",
        serviceDetails: {
          env: "docker",
          dockerfilePath: $dockerfile,
          envVars: [
            { key: "TAILSCALE_AUTHKEY", value: $tsKey },
            { key: "TAILSCALE_HOSTNAME", value: $tsHostname },
            { key: "NODE_ENV", value: "production" },
            { key: "PORT", value: "80" }
          ]
        }
      }')")

  SERVICE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.service.id // empty')
  if [[ -z "$SERVICE_ID" ]]; then
    echo "ERROR: Failed to create Render service."
    echo "Response: $CREATE_RESPONSE"
    exit 1
  fi
  echo "Service created with ID: ${SERVICE_ID}"
  echo "Deploy triggered automatically on creation. Done!"
  echo "Monitor at: https://dashboard.render.com/d/${SERVICE_ID}"
  exit 0
else
  echo "Found existing service: ${SERVICE_ID}"
fi

# --- Step 4: Update TAILSCALE_AUTHKEY env var ---
echo "Updating TAILSCALE_AUTHKEY env var..."
UPDATE_RESPONSE=$(curl -s -X PUT "${RENDER_API}/services/${SERVICE_ID}/env-vars/TAILSCALE_AUTHKEY" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg val "$EPHEMERAL_KEY" '{ value: $val }')")

echo "Env var updated."

# --- Step 5: Trigger deploy ---
echo "Triggering deploy..."
DEPLOY_RESPONSE=$(curl -s -X POST "${RENDER_API}/services/${SERVICE_ID}/deploys" \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')

DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.id // empty')
if [[ -z "$DEPLOY_ID" ]]; then
  echo "ERROR: Failed to trigger deploy."
  echo "Response: $DEPLOY_RESPONSE"
  exit 1
fi

echo "Deploy triggered! ID: ${DEPLOY_ID}"
echo "Monitor at: https://dashboard.render.com/d/${SERVICE_ID}"
