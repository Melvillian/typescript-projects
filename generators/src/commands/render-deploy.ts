import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

import { Command } from 'commander';

const RENDER_YAML_PATH = 'render.yaml';

const renderDeploy = new Command('render-deploy')
  .description(
    'Add Render deployment files (Dockerfile, .dockerignore) and update render.yaml for an app in apps/',
  )
  .argument(
    '<app-name>',
    'Name of the app directory under apps/ (e.g. my-service)',
  )
  .action(async (appName: string) => {
    const targetPath = join('apps', appName);
    console.log(`Adding Render deploy files to: ${targetPath}`);

    try {
      await generateDockerfile(targetPath, appName);
      await generateDockerignore(targetPath);
      await appendToRenderYaml(appName);

      console.log('\n✓ Render deploy files generated successfully!');
      console.log('\nNext steps:');
      console.log(
        '1. Create a Blueprint in the Render dashboard pointing to render.yaml',
      );
      console.log(
        '   (one-time setup: https://dashboard.render.com/select-repo?type=blueprint)',
      );

      console.log('2. Then, commit your changes to the main branch:');
      console.log('   git add && git commit -a');

      console.log('3. Finally, just push to main to deploy:');
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
RUN bun build --compile apps/${appName}/src/main.ts --outfile server

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

async function generateDockerignore(basePath: string) {
  const content = `node_modules
dist
.env
.env.local
.git
.gitignore
`;

  await writeFile(join(basePath, '.dockerignore'), content);
  console.log('✓ Created .dockerignore');
}

async function appendToRenderYaml(appName: string) {
  const serviceEntry = `
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

  let existing = '';
  try {
    existing = await readFile(RENDER_YAML_PATH, 'utf-8');
  } catch {
    // File doesn't exist, create it with the services header
    existing = 'services:\n';
  }

  if (existing.includes(`name: ${appName}`)) {
    console.log(
      `⚠ render.yaml already contains a service named '${appName}', skipping`,
    );
    return;
  }

  await writeFile(RENDER_YAML_PATH, existing.trimEnd() + '\n' + serviceEntry);
  console.log('✓ Updated render.yaml');
}

export default renderDeploy;
