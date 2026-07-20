# FROM node:22-alpine
# WORKDIR /app
# COPY . .
# RUN npm install -g pnpm
# RUN pnpm install
# EXPOSE 3000
# CMD ["pnpm", "run", "dev", "--host"]

FROM node:22-alpine

WORKDIR /app

COPY package*.json pnpm-lock.yaml .npmrc* ./

RUN npm install -g pnpm

RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm","run","dev","--host"]