# ================================================================
# BITNEST SCRAPER API - Production Docker Image
# ================================================================
# Optimized for Railway deployment with Playwright support
# Includes Chromium browser with all system dependencies
# BUILD VERSION: 2025-10-31-v3-16h32 (FORCE Railway rebuild detection)

FROM node:18-bullseye-slim

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    # Chromium dependencies
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    # Additional utilities
    ca-certificates \
    fonts-liberation \
    wget \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set Playwright browsers path to app directory
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

# Install Playwright browsers as ROOT with system deps
# (--with-deps requires root for apt-get)
RUN npx playwright install chromium --with-deps

# Create non-root user for security WITHOUT home directory
# -M = no home directory (will use /app as effective home)
RUN useradd -M -u 1000 scraper && \
    chown -R scraper:scraper /app && \
    mkdir -p /home/scraper && \
    ln -s /app/.cache /home/scraper/.cache && \
    chown -h scraper:scraper /home/scraper/.cache

# Switch to non-root user
USER scraper

# CRITICAL: Override HOME to /app so Playwright uses /app/.cache
# Default useradd HOME is /home/scraper which causes path mismatch
# Symlink ensures Playwright finds browsers regardless of path resolution
ENV HOME=/app

# Expose port (Railway will override with PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT:-8080}/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
