FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm exec --yes --package=pnpm@11.25.0 -- pnpm install --prod --frozen-lockfile --ignore-scripts

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node index.html app.css shell.css information.css operations.css app.js information.js operations.js ./
COPY --chown=node:node regional-parity.css regional-parity.js resource-parity.css resource-parity.js canada-detail.css islands-detail.css ./
COPY --chown=node:node assets ./assets
COPY --chown=node:node admin ./admin
COPY --chown=node:node tracking ./tracking
COPY --chown=node:node server ./server
USER node
EXPOSE 8080
CMD ["node", "server/index.mjs"]
