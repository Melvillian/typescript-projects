#!/bin/bash
set -euo pipefail

# --- Config ---
SERVICE_NAME="playground-playgroup-swap"
REPO_URL="https://github.com/Melvillian/playground-playgroup-swap"
DOCKERFILE_PATH="apps/playground-playgroup-swap/Dockerfile"
SERVICE_TYPE="web_service"
RENDER_API="https://api.render.com/v1"
WORKSPACE_OWNER_ID="tea-cspvkb8gph6c73ft0hd0"

# --- Step 1: Validate required env vars ---
if [[ -z "${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: RENDER_API_KEY is not set."
  exit 1
fi

# --- Step 2: Find or create the Render service ---
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

  # The Render API ignores dockerfilePath during creation, so patch it now
  echo "Setting Dockerfile path to '${DOCKERFILE_PATH}'..."
  curl -s -X PATCH "${RENDER_API}/services/${SERVICE_ID}" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg dockerfile "$DOCKERFILE_PATH" \
      '{ serviceDetails: { envSpecificDetails: { dockerfilePath: $dockerfile, dockerContext: "." } } }')" > /dev/null

  echo "Triggering deploy..."
  curl -s -X POST "${RENDER_API}/services/${SERVICE_ID}/deploys" \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}' > /dev/null

  echo "Deploy triggered! Monitor at: https://dashboard.render.com/d/${SERVICE_ID}"
  exit 0
else
  echo "Found existing service: ${SERVICE_ID}"
fi

# --- Step 3: Trigger deploy ---
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
