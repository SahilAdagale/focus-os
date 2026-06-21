# Stage 1: Install production dependencies
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --omit=dev

# Stage 2: Clean runner image
FROM node:18-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY . .

EXPOSE 8080
ENV NODE_ENV=production

CMD ["node", "server.js"]
