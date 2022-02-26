FROM node:16-alpine AS base

WORKDIR /invite

FROM base AS builder

COPY . ./

RUN yarn
RUN yarn build

FROM base AS runner

ENV NODE_ENV=production

COPY --from=builder /invite/package.json ./package.json
COPY --from=builder /invite/dist ./dist

RUN yarn

CMD ["npm", "run", "start"]
