FROM --platform=linux/arm64 node:alpine AS build

USER root

WORKDIR /app

ENV NODE_ENV="production"

COPY dist/ dist/
COPY package.json .

RUN chown -R node:node /app

FROM --platform=linux/arm64 nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]