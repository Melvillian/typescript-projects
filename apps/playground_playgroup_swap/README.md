# Tailscale-Enabled Render Private Service

This project sets up a Node.js/Express server on Render that:

- Runs as a Render private service (not accessible from public internet)
- Uses Tailscale for secure networking
- Listens on port 80 (HTTP)
- Relies on Render for SSL termination and request forwarding

## Architecture

```
Internet (HTTPS) → Render SSL Termination → Render Private Network (HTTP:80) → This Service
                                              ↓
                                         Tailscale Network
```

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

Copy `.env.example` to `.env` and fill in your Tailscale auth key:

```bash
cp .env.example .env
```

Edit `.env`:

```
TAILSCALE_AUTHKEY=tskey-auth-xxxxxxxxxxxxx
TAILSCALE_HOSTNAME=render-endpoint
```

### 3. Deploy to Render

There are two ways to deploy:

#### Option A: Using Render Dashboard

1. Push this code to a Git repository
2. Connect the repository to Render
3. Render will automatically detect `render.yaml`
4. Add the `TAILSCALE_AUTHKEY` environment variable in the Render dashboard
5. Deploy

#### Option B: Using Render Blueprint

1. Push this code to a Git repository
2. Update `render.yaml` with your specific configuration
3. Deploy using: `render deploy`

### 4. Verify Deployment

Once deployed, check:

1. **Render Dashboard**: Service should be running
2. **Tailscale Admin Console**: Your device should appear online
3. **From another Tailscale device**:
   ```bash
   curl http://render-endpoint
   # or use the Tailscale IP
   curl http://100.x.x.x
   ```

## API Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `GET /api/hello` - Example API endpoint

## Local Development

For local development:

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev
```

Note: Tailscale will not be available in local development unless you run it separately.

## Environment Variables

| Variable             | Description                      | Required                      |
| -------------------- | -------------------------------- | ----------------------------- |
| `TAILSCALE_AUTHKEY`  | Tailscale authentication key     | Yes                           |
| `TAILSCALE_HOSTNAME` | Hostname for this Tailscale node | No (default: render-endpoint) |
| `PORT`               | Port to listen on                | No (default: 80)              |
| `NODE_ENV`           | Node environment                 | No (default: production)      |

## How It Works

1. **Dockerfile**: Installs Tailscale alongside Node.js
2. **start.sh**: Starts Tailscale daemon and authenticates, then starts the Express server
3. **Render Private Service**: Service is not exposed to public internet
4. **Tailscale**: Provides secure networking to access the service
5. **SSL Termination**: Handled by Render before reaching your service

## Accessing from Other Services

From other services in your Tailscale network:

```bash
# Using hostname
curl http://render-endpoint

# Using Tailscale IP (check admin console for IP)
curl http://100.x.x.x
```

## Troubleshooting

### Service won't start

- Check Render logs for errors
- Verify `TAILSCALE_AUTHKEY` is set correctly
- Ensure auth key hasn't expired

### Can't access from Tailscale network

- Verify the service appears in Tailscale admin console
- Check that your client device is on the same Tailscale network
- Try using the Tailscale IP directly instead of hostname

### Port issues

- Render private services can use any port internally
- Ensure your server binds to `0.0.0.0` not `localhost`
- Check that PORT environment variable matches your server configuration

## Security Notes

- Never commit `.env` file with real credentials
- Use ephemeral auth keys for production deployments
- Rotate auth keys regularly
- Monitor access through Tailscale admin console

## Customization

To customize this service:

1. Edit `src/server.ts` to add your endpoints
2. Update `render.yaml` for Render-specific configuration
3. Modify `Dockerfile` if you need additional dependencies
4. Update `start.sh` for custom startup behavior

## License

MIT
