# FROM node:22-alpine
# WORKDIR /app
# COPY . .
# RUN npm install -g pnpm
# RUN pnpm install
# EXPOSE 3000
# CMD ["pnpm", "run", "dev"]

FROM node:22-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml .npmrc* ./

RUN npm install -g pnpm

RUN pnpm install

COPY . .

EXPOSE 3636

CMD ["pnpm","run","dev"]