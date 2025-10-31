# BitNest Scraper API - Production Docker Image
# Optimized for Railway/Render deployment

FROM node:18-slim

# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libcups2 \
    fonts-liberation \
    libappindicator3-1 \
    libnss3 \
    libnspr4 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install Playwright browsers (chromium only for efficiency)
RUN npx playwright install chromium

# Copy application source
COPY src ./src

# Create non-root user for security
RUN useradd -m -u 1001 scraper && \
    chown -R scraper:scraper /app

USER scraper

# Expose port
EXPOSE 8080

# Health check for Railway/Render
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start application
CMD ["node", "src/index.js"]
