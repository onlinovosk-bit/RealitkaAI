FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/mcp-shared   ./packages/mcp-shared
COPY packages/mcp-calendar ./packages/mcp-calendar
RUN npm install --workspace=packages/mcp-shared --workspace=packages/mcp-calendar
RUN npm run build --workspace=packages/mcp-shared
RUN npm run build --workspace=packages/mcp-calendar

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/packages/mcp-shared/dist   ./packages/mcp-shared/dist
COPY --from=builder /app/packages/mcp-calendar/dist  ./packages/mcp-calendar/dist
COPY --from=builder /app/node_modules                ./node_modules
ENV NODE_ENV=production
ENV GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON=""
CMD ["node", "packages/mcp-calendar/dist/server.js"]
