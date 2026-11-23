FROM nginx:1.31.9-alpine@sha256:fb4658584bd9a916ffb6f6e365f97c25cfdb2923801f551ea08356e695f14ff7

LABEL io.maxhq.image.source="https://github.com/maxmorhardt/squares"
LABEL io.maxhq.image.description="Squares Frontend - Game's web application"
LABEL io.maxhq.image.vendor="Max Morhardt"
LABEL io.maxhq.image.licenses="PolyForm-Noncommercial-1.0.0"

RUN apk upgrade --no-cache

ENV NODE_ENV="production"

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx dist/client/ .
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx security-headers.conf /etc/nginx/snippets/security-headers.conf

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]