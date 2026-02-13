# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Production Stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
RUN npm install --production

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend files
COPY backend ./backend
COPY supabaseClient.js ./
# Copy other necessary files if any (e.g. .env.example, though envs come from docker-compose)
COPY .env.example ./

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api || exit 1

# Start command (updated to point to backend/server.js)
CMD ["node", "backend/server.js"]
