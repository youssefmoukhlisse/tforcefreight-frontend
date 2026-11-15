# Deployment

- Railway project: `tforcefreight-frontend`
- Environment: `production`
- Service: `tforcefreight-web`
- Public URL: https://tforcefreight-web-production.up.railway.app
- Source repository: https://github.com/youssefmoukhlisse/tforcefreight-frontend
- Source branch: `main`
- Rollback reference for the parity pass: `backup/pre-parity-audit`, commit `59d4921e7904d4873d3ce51c3ea1124b6178057c`.

Railway deploys new commits from `main`. The `Dockerfile` serves the static frontend with Nginx and preserves direct routes through SPA fallback. Missing static files return 404.
