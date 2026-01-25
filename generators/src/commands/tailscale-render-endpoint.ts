import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { Command } from 'commander';

const tailscaleRenderEndpoint = new Command('tailscale-render-endpoint')
  .description(
    'Generate a Tailscale-enabled Render private service endpoint with SSL termination',
  )
  .option('-p, --path <path>', 'Path to generate the project', '.')
  .action(async (options) => {
    const targetPath = options.path;
    console.log(
      `Generating tailscale-render-endpoint project at: ${targetPath}`,
    );

    try {
      // Create directories
      await mkdir(join(targetPath, 'src'), { recursive: true });

      // Generate files
      await generateDockerfile(targetPath);
      await generateRenderYaml(targetPath);
      await generatePackageJson(targetPath);
      await generateServerCode(targetPath);
      await generateEnvExample(targetPath);
      await generateStartupScript(targetPath);
      await generateGitignore(targetPath);
      await generateReadme(targetPath);
      await generateDockerignore(targetPath);

      console.log('\n✓ Project generated successfully!');
      console.log('\nNext steps:');
      console.log(
        '1. Copy .env.example to .env and fill in your Tailscale auth key',
      );
      console.log('2. Update render.yaml with your service configuration');
      console.log('3. Deploy to Render');
      console.log('\nSee README.md for detailed instructions.');
    } catch (error) {
      console.error('Error generating project:', error);
      process.exit(1);
    }
  });

async function generateDockerfile(basePath: string) {
  const content = `FROM node:22-alpine

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
`;

  await writeFile(join(basePath, 'Dockerfile'), content);
  console.log('✓ Created Dockerfile');
}

async function generateRenderYaml(basePath: string) {
  const content = `services:
  - type: pserv
    name: tailscale-endpoint
    env: docker
    autoDeploy: true
    dockerfilePath: ./Dockerfile
    envVars:
      - key: TAILSCALE_AUTHKEY
        sync: false
      - key: TAILSCALE_HOSTNAME
        value: render-endpoint
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 80
`;

  await writeFile(join(basePath, 'render.yaml'), content);
  console.log('✓ Created render.yaml');
}

async function generatePackageJson(basePath: string) {
  const content = {
    name: 'tailscale-render-endpoint',
    version: '1.0.0',
    type: 'module',
    scripts: {
      build: 'tsc',
      start: 'node dist/server.js',
      dev: 'tsx watch src/server.ts',
    },
    dependencies: {
      express: '^4.18.2',
    },
    devDependencies: {
      '@types/express': '^4.17.21',
      '@types/node': '^20.0.0',
      tsx: '^4.7.0',
      typescript: '^5.3.3',
    },
  };

  await writeFile(
    join(basePath, 'package.json'),
    JSON.stringify(content, null, 2),
  );
  console.log('✓ Created package.json');
}

async function generateServerCode(basePath: string) {
  const serverTs = `import express from 'express';

const app = express();
const PORT = parseInt(process.env.PORT || '80', 10);

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Example API endpoint
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Tailscale-enabled Render endpoint!' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'tailscale-render-endpoint',
    version: '1.0.0',
    endpoints: ['/health', '/api/hello'],
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server listening on port \${PORT}\`);
});
`;

  const tsConfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
`;

  await writeFile(join(basePath, 'src', 'server.ts'), serverTs);
  await writeFile(join(basePath, 'tsconfig.json'), tsConfig);
  console.log('✓ Created src/server.ts and tsconfig.json');
}

async function generateEnvExample(basePath: string) {
  const content = `# Tailscale Configuration
# Get your auth key from: https://login.tailscale.com/admin/settings/keys
TAILSCALE_AUTHKEY=your-tailscale-auth-key-here

# Optional: Custom hostname for your Tailscale node
TAILSCALE_HOSTNAME=render-endpoint

# Server Configuration
NODE_ENV=production
PORT=80
`;

  await writeFile(join(basePath, '.env.example'), content);
  console.log('✓ Created .env.example');
}

async function generateStartupScript(basePath: string) {
  const content = `#!/bin/sh

# Start Tailscale daemon in the background
tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

# Wait for tailscaled to start
sleep 2

# Authenticate with Tailscale
tailscale up --authkey="\${TAILSCALE_AUTHKEY}" --hostname="\${TAILSCALE_HOSTNAME:-render-endpoint}" --accept-routes

# Start the Node.js server
exec node dist/server.js
`;

  await writeFile(join(basePath, 'start.sh'), content);
  console.log('✓ Created start.sh');
}

async function generateGitignore(basePath: string) {
  const content = `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production build
dist/
build/

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# TypeScript
*.tsbuildinfo

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache
`;

  await writeFile(join(basePath, '.gitignore'), content);
  console.log('✓ Created .gitignore');
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

async function generateReadme(basePath: string) {
  const content = `# Tailscale-Enabled Render Private Service

This project sets up a Node.js/Express server on Render that:
- Runs as a Render private service (not accessible from public internet)
- Uses Tailscale for secure networking
- Listens on port 80 (HTTP)
- Relies on Render for SSL termination and request forwarding

## Architecture

\`\`\`
Internet (HTTPS) → Render SSL Termination → Render Private Network (HTTP:80) → This Service
                                              ↓
                                         Tailscale Network
\`\`\`

## Prerequisites

1. A Render account
2. A Tailscale account
3. A Tailscale auth key (get one from https://login.tailscale.com/admin/settings/keys)

## Setup Instructions

### 1. Generate Tailscale Auth Key

1. Go to https://login.tailscale.com/admin/settings/keys
2. Click "Generate auth key"
3. Enable "Reusable" if you plan to deploy multiple instances
4. Optionally set an expiration time
5. Copy the generated key

### 2. Configure Environment Variables

Copy \`.env.example\` to \`.env\` and fill in your Tailscale auth key:

\`\`\`bash
cp .env.example .env
\`\`\`

Edit \`.env\`:
\`\`\`
TAILSCALE_AUTHKEY=tskey-auth-xxxxxxxxxxxxx
TAILSCALE_HOSTNAME=render-endpoint
\`\`\`

### 3. Deploy to Render

There are two ways to deploy:

#### Option A: Using Render Dashboard

1. Push this code to a Git repository
2. Connect the repository to Render
3. Render will automatically detect \`render.yaml\`
4. Add the \`TAILSCALE_AUTHKEY\` environment variable in the Render dashboard
5. Deploy

#### Option B: Using Render Blueprint

1. Push this code to a Git repository
2. Update \`render.yaml\` with your specific configuration
3. Deploy using: \`render deploy\`

### 4. Verify Deployment

Once deployed, check:

1. **Render Dashboard**: Service should be running
2. **Tailscale Admin Console**: Your device should appear online
3. **From another Tailscale device**:
   \`\`\`bash
   curl http://render-endpoint
   # or use the Tailscale IP
   curl http://100.x.x.x
   \`\`\`

## API Endpoints

- \`GET /\` - Service information
- \`GET /health\` - Health check
- \`GET /api/hello\` - Example API endpoint

## Local Development

For local development:

\`\`\`bash
# Install dependencies
npm install

# Run in development mode
npm run dev
\`\`\`

Note: Tailscale will not be available in local development unless you run it separately.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| \`TAILSCALE_AUTHKEY\` | Tailscale authentication key | Yes |
| \`TAILSCALE_HOSTNAME\` | Hostname for this Tailscale node | No (default: render-endpoint) |
| \`PORT\` | Port to listen on | No (default: 80) |
| \`NODE_ENV\` | Node environment | No (default: production) |

## How It Works

1. **Dockerfile**: Installs Tailscale alongside Node.js
2. **start.sh**: Starts Tailscale daemon and authenticates, then starts the Express server
3. **Render Private Service**: Service is not exposed to public internet
4. **Tailscale**: Provides secure networking to access the service
5. **SSL Termination**: Handled by Render before reaching your service

## Accessing from Other Services

From other services in your Tailscale network:

\`\`\`bash
# Using hostname
curl http://render-endpoint

# Using Tailscale IP (check admin console for IP)
curl http://100.x.x.x
\`\`\`

## Troubleshooting

### Service won't start

- Check Render logs for errors
- Verify \`TAILSCALE_AUTHKEY\` is set correctly
- Ensure auth key hasn't expired

### Can't access from Tailscale network

- Verify the service appears in Tailscale admin console
- Check that your client device is on the same Tailscale network
- Try using the Tailscale IP directly instead of hostname

### Port issues

- Render private services can use any port internally
- Ensure your server binds to \`0.0.0.0\` not \`localhost\`
- Check that PORT environment variable matches your server configuration

## Security Notes

- Never commit \`.env\` file with real credentials
- Use ephemeral auth keys for production deployments
- Rotate auth keys regularly
- Monitor access through Tailscale admin console

## Customization

To customize this service:

1. Edit \`src/server.ts\` to add your endpoints
2. Update \`render.yaml\` for Render-specific configuration
3. Modify \`Dockerfile\` if you need additional dependencies
4. Update \`start.sh\` for custom startup behavior

## License

MIT
`;

  await writeFile(join(basePath, 'README.md'), content);
  console.log('✓ Created README.md');
}

// Make sure to also generate the start.sh script
tailscaleRenderEndpoint.hook('postAction', async () => {
  // This is handled in the action itself
});

export default tailscaleRenderEndpoint;
