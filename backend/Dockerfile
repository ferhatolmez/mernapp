FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads/avatars uploads/chat logs
EXPOSE 5000
CMD ["node", "server.js"]
