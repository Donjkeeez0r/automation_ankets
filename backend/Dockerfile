FROM node:20-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN pnpm run build

FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@10 --activate

# Приложение работает от встроенного непривилегированного пользователя node.
RUN mkdir -p /app/uploads && chown node:node /app /app/uploads

COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/prisma ./prisma
COPY --chown=node:node --from=build /app/src/generated ./src/generated
COPY --chown=node:node --from=build /app/assets ./assets

USER node

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/src/main"]
