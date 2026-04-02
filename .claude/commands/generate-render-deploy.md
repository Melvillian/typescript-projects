---
description: Add Render deployment files (Dockerfile, .dockerignore) and a render.yaml service entry for an app in apps/
arguments:
  - name: app-name
    description: Name of the app directory under apps/ (e.g. my-service)
    required: true
---

Add Render CD deployment capability to the app `apps/$ARGUMENTS.app-name`.

## Steps

1. First, verify that `apps/$ARGUMENTS.app-name` exists. If it doesn't, stop and tell the user.

2. Build the generators package (required before running the CLI):
   ```
   cd generators && bun run build && cd ..
   ```

3. Run the render-deploy generator:
   ```
   bun generators/bin/generator.js render-deploy $ARGUMENTS.app-name
   ```

4. Verify the generated files exist:
   - `apps/$ARGUMENTS.app-name/Dockerfile`
   - `apps/$ARGUMENTS.app-name/.dockerignore`
   - The root `render.yaml` has a new service entry for `$ARGUMENTS.app-name`

5. Show the user what was generated and remind them of next steps:
   - If this is the first service in render.yaml, they need a one-time Blueprint setup in the Render dashboard
   - Otherwise, just `git push origin main` to deploy
