FROM node:22-alpine AS production

# Build argument for version
ARG APP_VERSION=dev

# Add user and group - combined into one RUN to reduce layers
RUN addgroup -g 2000 -S appgroup && \
    adduser -DH -s /sbin/nologin -u 2000 -G appgroup -S appuser

# Set workdir
WORKDIR /app

# Copy needed files (not needed files in .dockerignore)
COPY --chown=appuser:appgroup ./.next /app/.next
COPY --chown=appuser:appgroup ./node_modules /app/node_modules
COPY --chown=appuser:appgroup ./public /app/public
COPY --chown=appuser:appgroup ./entrypoint.sh /app/entrypoint.sh
COPY --chown=appuser:appgroup ./next.config.ts /app/next.config.ts
COPY --chown=appuser:appgroup ./package.json /app/package.json

# Set environment variables
ENV APPLICATION_ROOT="/app" \
    APP_VERSION="${APP_VERSION}" \
    NODE_ENV=production

# Make entrypoint executable
RUN chmod +x ./entrypoint.sh

# Use non-root user
USER appuser

ENTRYPOINT ["./entrypoint.sh"]
