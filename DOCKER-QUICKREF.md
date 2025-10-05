# Docker Quick Reference

## Initial Setup
```bash
cp .env.sample .env           # Copy environment template
# Edit .env and add your API key
docker-compose up -d          # Start application
```

## Common Commands
```bash
docker-compose up -d          # Start (detached)
docker-compose down           # Stop and remove
docker-compose restart        # Restart services
docker-compose logs -f        # View logs
docker-compose ps             # Check status
docker-compose build          # Rebuild images
docker-compose up -d --build  # Rebuild and restart
```

## Access
- Application: http://localhost:4173
- Logs: `docker-compose logs -f`

## Troubleshooting
```bash
docker-compose logs portfolio-tracker  # Check errors
docker-compose config                  # Verify config
docker-compose down && docker-compose up -d --build  # Full restart
```

## Cleanup
```bash
docker-compose down -v        # Remove everything
docker system prune -a        # Clean Docker (careful!)
```

See [DOCKER.md](./DOCKER.md) for detailed documentation.
