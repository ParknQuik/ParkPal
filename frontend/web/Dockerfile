# Multi-stage build for optimized production image

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies needed for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_PAYMONGO_PUBLIC_KEY
ARG VITE_APP_ENV=production
ARG CACHE_BUST

# Set environment variables for Vite to pick up during build
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_PAYMONGO_PUBLIC_KEY=$VITE_PAYMONGO_PUBLIC_KEY
ENV VITE_APP_ENV=$VITE_APP_ENV

# Debug: Print environment variables and cache bust value
RUN echo "=== Build Environment Variables ===" && \
    echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" && \
    echo "VITE_GOOGLE_MAPS_API_KEY=${VITE_GOOGLE_MAPS_API_KEY:0:20}..." && \
    echo "VITE_PAYMONGO_PUBLIC_KEY=${VITE_PAYMONGO_PUBLIC_KEY:0:20}..." && \
    echo "VITE_APP_ENV=$VITE_APP_ENV" && \
    echo "CACHE_BUST=$CACHE_BUST" && \
    echo "===================================="

# Build the application with env vars
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/health || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
