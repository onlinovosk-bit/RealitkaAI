FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/mcp-shared ./packages/mcp-shared
COPY packages/mcp-crm    ./packages/mcp-crm
RUN npm install --workspace=packages/mcp-shared --workspace=packages/mcp-crm
RUN npm run build --workspace=packages/mcp-shared
RUN npm run build --workspace=packages/mcp-crm

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/packages/mcp-shared/dist ./packages/mcp-shared/dist
COPY --from=builder /app/packages/mcp-crm/dist     ./packages/mcp-crm/dist
COPY --from=builder /app/node_modules               ./node_modules
ENV NODE_ENV=production
CMD ["node", "packages/mcp-crm/dist/server.js"]
