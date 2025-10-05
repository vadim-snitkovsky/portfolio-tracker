# Docker Deployment Guide

This guide covers deploying the Portfolio Tracker using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 1.29+ (or Docker Desktop with Compose V2)
- Polygon.io API key (get free at https://polygon.io/)

## Quick Start

### 1. Environment Setup

```bash
# Copy the environment template
cp .env.sample .env

# Edit .env with your favorite editor
nano .env  # or vim, code, etc.
```

Add your Polygon.io API key:
```env
VITE_POLYGON_API_KEY=your_actual_api_key_here
VITE_POLYGON_BASE_URL=https://api.polygon.io
```

### 2. Build and Run

```bash
# Start the application (builds if needed)
docker-compose up -d

# View logs
docker-compose logs -f portfolio-tracker
```

### 3. Access the Application

Open your browser to: **http://localhost:4173**

## Docker Compose Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services (keeps containers)
docker-compose stop

# Stop and remove containers
docker-compose down

# Stop and remove everything (including volumes)
docker-compose down -v

# View logs
docker-compose logs -f

# Restart services
docker-compose restart
```

### Building

```bash
# Build/rebuild images
docker-compose build

# Build without cache (clean build)
docker-compose build --no-cache

# Build and start in one command
docker-compose up -d --build
```

### Monitoring

```bash
# Check status
docker-compose ps

# View resource usage
docker stats portfolio-tracker

# Execute commands in running container
docker-compose exec portfolio-tracker sh
```

## Docker (Without Compose)

If you prefer to use Docker directly:

### Build Image

```bash
# Using environment variables from .env
docker build \
  --build-arg VITE_POLYGON_API_KEY=$(grep VITE_POLYGON_API_KEY .env | cut -d '=' -f2) \
  --build-arg VITE_POLYGON_BASE_URL=$(grep VITE_POLYGON_BASE_URL .env | cut -d '=' -f2) \
  -t portfolio-tracker:latest .
```

### Run Container

```bash
# Run in detached mode
docker run -d \
  -p 4173:4173 \
  --name portfolio-tracker \
  --restart unless-stopped \
  portfolio-tracker:latest

# View logs
docker logs -f portfolio-tracker

# Stop container
docker stop portfolio-tracker

# Remove container
docker rm portfolio-tracker
```

## Configuration

### Port Mapping

Default: Container port `4173` → Host port `4173`

To use a different host port:

**Docker Compose** (`docker-compose.yml`):
```yaml
services:
  portfolio-tracker:
    ports:
      - "8080:4173"  # Access on http://localhost:8080
```

**Docker CLI**:
```bash
docker run -d -p 8080:4173 --name portfolio-tracker portfolio-tracker:latest
```

### Environment Variables

The application uses build-time environment variables for Vite:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_POLYGON_API_KEY` | Yes | - | Your Polygon.io API key |
| `VITE_POLYGON_BASE_URL` | No | `https://api.polygon.io` | Polygon.io API base URL |

> **Important**: These are build-time variables. Changes require rebuilding the image:
> ```bash
> docker-compose build --no-cache
> docker-compose up -d
> ```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs portfolio-tracker

# Verify environment variables
docker-compose config

# Check if port is already in use
lsof -i :4173  # macOS/Linux
netstat -ano | findstr :4173  # Windows
```

### API Key Issues

```bash
# Verify .env file exists and contains key
cat .env | grep VITE_POLYGON_API_KEY

# Rebuild with clean slate
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Build Failures

```bash
# Clear Docker build cache
docker builder prune -a

# Remove old images
docker image prune -a

# Rebuild from scratch
docker-compose build --no-cache
```

### Performance Issues

```bash
# Check resource usage
docker stats portfolio-tracker

# Increase Docker memory limit (Docker Desktop Settings)
# Recommended: 2GB+ RAM, 2+ CPUs
```

## Production Deployment

### Security Best Practices

1. **Never commit `.env` file**
   - Already in `.gitignore`
   - Use secrets management in production

2. **Use environment-specific configs**
   ```bash
   # Production
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

3. **Enable health checks** (add to `docker-compose.yml`):
   ```yaml
   services:
     portfolio-tracker:
       healthcheck:
         test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:4173"]
         interval: 30s
         timeout: 10s
         retries: 3
         start_period: 40s
   ```

### Reverse Proxy Setup

Example with Nginx:

```nginx
server {
    listen 80;
    server_name portfolio.example.com;

    location / {
        proxy_pass http://localhost:4173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL/HTTPS with Traefik

```yaml
version: '3.8'

services:
  portfolio-tracker:
    build: .
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portfolio.rule=Host(`portfolio.example.com`)"
      - "traefik.http.routers.portfolio.entrypoints=websecure"
      - "traefik.http.routers.portfolio.tls.certresolver=letsencrypt"
```

## Image Size Optimization

Current image size: ~150MB (Node Alpine + built assets)

### Multi-stage Build Breakdown

1. **deps** stage: Install dependencies (~200MB)
2. **builder** stage: Build production bundle (~300MB)
3. **runner** stage: Serve static files (~150MB final)

Only the final `runner` stage is kept in the image.

## Updating

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Verify new version is running
docker-compose logs -f
```

## Cleanup

```bash
# Remove containers and networks
docker-compose down

# Remove everything including volumes
docker-compose down -v

# Remove all portfolio-tracker images
docker images | grep portfolio-tracker | awk '{print $3}' | xargs docker rmi

# Clean Docker system (careful!)
docker system prune -a --volumes
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Polygon.io API Docs](https://polygon.io/docs)
- [Project README](./README.md)
