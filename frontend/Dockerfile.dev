# Development frontend container with hot reload
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

# Copy source files (will be overridden by volume mounts in development)
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "--port", "5173"]

