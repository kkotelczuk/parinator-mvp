FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/config/package.json ./packages/config/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build --workspace=@parinator/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
