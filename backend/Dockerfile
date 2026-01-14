# Development backend container with hot reload
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY schema.sql ./schema.sql

EXPOSE 4000
CMD ["npm", "run", "dev"]

