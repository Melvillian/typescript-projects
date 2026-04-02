# Render Web Service

This project sets up a Node.js/Express server deployed to Render via Docker with Continuous Deployment.

- Runs as a Render web service with a public URL
- Deploys automatically on push to `main`
- Listens on port 80 (HTTP)
- Render handles SSL termination

## Architecture

```
Internet (HTTPS) → Render SSL Termination → Docker Container (HTTP:80) → Express Server
```

## Prerequisites

1. A Render account
2. The Render CLI (optional, for initial service creation)

## Setup Instructions

### 1. Initial Service Creation

Run the deploy script once to create the service on Render:

```bash
RENDER_API_KEY=your-key ./scripts/deploy.sh
```

This creates the web service and connects it to the GitHub repo with auto-deploy enabled.

### 2. Continuous Deployment

After initial setup, just push to `main`:

```bash
git push origin main
```

Render detects the push, builds the Docker image, and deploys automatically.

### 3. Verify Deployment

Once deployed:

```bash
curl https://playground-playgroup-swap.onrender.com/health
```

## API Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `GET /api/hello` - Example API endpoint

## Local Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev
```

## Environment Variables

| Variable   | Description         | Required                 |
| ---------- | ------------------- | ------------------------ |
| `PORT`     | Port to listen on   | No (default: 80)        |
| `NODE_ENV` | Node environment    | No (default: production) |

## How It Works

1. **Dockerfile**: Multi-stage build — compiles the app with Bun, then runs the binary on Alpine
2. **render.yaml**: Declares the web service with Docker environment and auto-deploy
3. **Continuous Deployment**: Render watches the `main` branch and deploys on every push

## Troubleshooting

### Service won't start

- Check Render logs for errors
- Ensure your server binds to `0.0.0.0` not `localhost`
- Check that PORT environment variable matches your server configuration

## Customization

1. Edit `src/server.ts` to add your endpoints
2. Update `render.yaml` for Render-specific configuration
3. Modify `Dockerfile` if you need additional dependencies

## License

MIT
