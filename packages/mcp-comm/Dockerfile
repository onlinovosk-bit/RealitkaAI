FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY packages/mcp-shared ./packages/mcp-shared
COPY packages/mcp-comm   ./packages/mcp-comm
RUN npm install --workspace=packages/mcp-shared --workspace=packages/mcp-comm
RUN npm run build --workspace=packages/mcp-shared
RUN npm run build --workspace=packages/mcp-comm

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/packages/mcp-shared/dist ./packages/mcp-shared/dist
COPY --from=builder /app/packages/mcp-comm/dist    ./packages/mcp-comm/dist
COPY --from=builder /app/node_modules              ./node_modules
ENV NODE_ENV=production
ENV RESEND_API_KEY=""
ENV TWILIO_ACCOUNT_SID=""
ENV TWILIO_AUTH_TOKEN=""
ENV TWILIO_FROM_NUMBER=""
CMD ["node", "packages/mcp-comm/dist/server.js"]
