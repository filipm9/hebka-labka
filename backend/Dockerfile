# Production backend container
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY schema.sql ./schema.sql
COPY src ./src

EXPOSE $PORT
CMD ["npm", "start"]
