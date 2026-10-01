FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json ./
RUN pnpm install

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm run build

# Образ nginx, рассчитанный на запуск без root (pid и временные файлы — в /tmp).
# Порты < 1024 требуют root, поэтому внутри контейнера nginx слушает 8080.
FROM nginxinc/nginx-unprivileged:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
