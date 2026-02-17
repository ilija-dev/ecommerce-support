FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

# Seed the database
RUN npx tsx src/db/seed.ts

EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
