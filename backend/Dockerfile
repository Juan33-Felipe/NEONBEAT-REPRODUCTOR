FROM node:20-alpine

RUN apk add --no-cache openssl wget

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci && npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

RUN npm run build

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

RUN mkdir -p /app/data /app/storage/audio

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL="file:/app/data/neonbeat.db"
ENV STORAGE_DIR="/app/storage/audio"
ENV MAX_FILE_SIZE_BYTES=52428800
ENV CORS_ORIGIN="*"

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3001/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
