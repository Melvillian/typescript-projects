import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { Command } from 'commander';

const renderDeploy = new Command('render-deploy')
  .description(
    'Add Render deployment files (Dockerfile, render.yaml, deploy script) to an app in apps/',
  )
  .argument('<app-name>', 'Name of the app directory under apps/ (e.g. my-service)')
  .action(async (appName: string) => {
    const targetPath = join('apps', appName);
    console.log(`Adding Render deploy files to: ${targetPath}`);

    try {
      await mkdir(join(targetPath, 'scripts'), { recursive: true });

      await generateDockerfile(targetPath, appName);
      await generateRenderYaml(targetPath, appName);
      await generateDeployScript(targetPath, appName);
      await generateDockerignore(targetPath);

      console.log('\n✓ Render deploy files generated successfully!');
      console.log('\nNext steps:');
      console.log(
        '1. Run the deploy script once to create the service on Render:',
      );
      console.log(
        `   RENDER_API_KEY=your-key bash ${targetPath}/scripts/deploy.sh`,
      );
      console.log('2. After that, just push to main to deploy:');
      console.log('   git push origin main');
    } catch (error) {
      console.error('Error generating deploy files:', error);
      process.exit(1);
    }
  });

async function generateDockerfile(basePath: string, appName: string) {
  const content = `# Stage 1: Build the single executable binary
FROM oven/bun:1.3.3-alpine AS builder

WORKDIR /app

# Copy the entire monorepo so bun has full workspace context
COPY . .

# Install all dependencies (full monorepo)
RUN bun install

# Compile the app into a single executable binary
RUN bun build --compile apps/${appName}/src/server.ts --outfile server

# Stage 2: Minimal runtime with the binary
FROM alpine:3.23

RUN apk add --no-cache ca-certificates libstdc++ libgcc

COPY --from=builder /app/server /app/server

EXPOSE 80

CMD ["/app/server"]
`;

  await writeFile(join(basePath, 'Dockerfile'), content);
  console.log('✓ Created Dockerfile');
}

async function generateRenderYaml(basePath: string, appName: string) {
  const content = `services:
  - type: web
    name: ${appName}
    env: docker
    autoDeploy: true
    dockerfilePath: apps/${appName}/Dockerfile
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 80
`;

  await writeFile(join(basePath, 'render.yaml'), content);
  console.log('✓ Created render.yaml');
}

async function generateDeployScript(basePath: string, appName: string) {
  const content = `#!/bin/bash
set -euo pipefail

# --- Config ---
SERVICE_NAME="${appName}"
REPO_URL="https://github.com/Melvillian/playground-playgroup-swap"
DOCKERFILE_PATH="apps/${appName}/Dockerfile"
SERVICE_TYPE="web_service"
RENDER_API="https://api.render.com/v1"
WORKSPACE_OWNER_ID="tea-cspvkb8gph6c73ft0hd0"

# --- Step 1: Validate required env vars ---
if [[ -z "\${RENDER_API_KEY:-}" ]]; then
  echo "ERROR: RENDER_API_KEY is not set."
  exit 1
fi

# --- Step 2: Find or create the Render service ---
echo "Looking for existing Render service '\${SERVICE_NAME}'..."
SERVICES_RESPONSE=$(curl -s "\${RENDER_API}/services?name=\${SERVICE_NAME}&limit=1" \\
  -H "Authorization: Bearer \${RENDER_API_KEY}")

SERVICE_ID=$(echo "$SERVICES_RESPONSE" | jq -r '.[0].service.id // empty')

if [[ -z "$SERVICE_ID" ]]; then
  echo "Service not found. Creating '\${SERVICE_NAME}'..."
  CREATE_RESPONSE=$(curl -s -X POST "\${RENDER_API}/services" \\
    -H "Authorization: Bearer \${RENDER_API_KEY}" \\
    -H "Content-Type: application/json" \\
    -d "$(jq -n \\
      --arg name "$SERVICE_NAME" \\
      --arg repo "$REPO_URL" \\
      --arg dockerfile "$DOCKERFILE_PATH" \\
      --arg type "$SERVICE_TYPE" \\
      --arg ownerId "$WORKSPACE_OWNER_ID" \\
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
  echo "Service created with ID: \${SERVICE_ID}"
  echo "Deploy triggered automatically on creation. Done!"
  echo "Monitor at: https://dashboard.render.com/d/\${SERVICE_ID}"
  exit 0
else
  echo "Found existing service: \${SERVICE_ID}"
fi

# --- Step 3: Trigger deploy ---
echo "Triggering deploy..."
DEPLOY_RESPONSE=$(curl -s -X POST "\${RENDER_API}/services/\${SERVICE_ID}/deploys" \\
  -H "Authorization: Bearer \${RENDER_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{}')

DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.id // empty')
if [[ -z "$DEPLOY_ID" ]]; then
  echo "ERROR: Failed to trigger deploy."
  echo "Response: $DEPLOY_RESPONSE"
  exit 1
fi

echo "Deploy triggered! ID: \${DEPLOY_ID}"
echo "Monitor at: https://dashboard.render.com/d/\${SERVICE_ID}"
`;

  const scriptPath = join(basePath, 'scripts', 'deploy.sh');
  await writeFile(scriptPath, content, { mode: 0o755 });
  console.log('✓ Created scripts/deploy.sh');
}

async function generateDockerignore(basePath: string) {
  const content = `node_modules
dist
.env
.env.local
.git
.gitignore
README.md
npm-debug.log
yarn-error.log
`;

  await writeFile(join(basePath, '.dockerignore'), content);
  console.log('✓ Created .dockerignore');
}

export default renderDeploy;
