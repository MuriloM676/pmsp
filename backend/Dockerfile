# Dockerfile — SIGPOL Backend

# Stage 1: dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Stage 2: imagem final
FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -g 1001 -S nodejs && \
    adduser  -S sigpol -u 1001 -G nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=sigpol:nodejs src ./src
COPY --chown=sigpol:nodejs package.json .
COPY --chown=sigpol:nodejs entrypoint.sh .

RUN mkdir -p uploads logs && \
    chown -R sigpol:nodejs uploads logs && \
    chmod +x entrypoint.sh

USER sigpol
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/health || exit 1

CMD ["sh", "entrypoint.sh"]
