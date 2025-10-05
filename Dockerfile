# syntax=docker/dockerfile:1

# Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Build the production bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build arguments for environment variables
ARG VITE_POLYGON_API_KEY
ARG VITE_POLYGON_BASE_URL
ENV VITE_POLYGON_API_KEY=${VITE_POLYGON_API_KEY}
ENV VITE_POLYGON_BASE_URL=${VITE_POLYGON_BASE_URL}

RUN npm run build

# Serve the built assets with a lightweight HTTP server
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
