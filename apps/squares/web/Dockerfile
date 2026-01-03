FROM nginx:alpine

LABEL io.maxstash.image.source="https://github.com/maxmorhardt/squares"
LABEL io.maxstash.image.description="Squares Frontend - Game's web application"
LABEL io.maxstash.image.vendor="Max Morhardt"
LABEL io.maxstash.image.licenses="MIT"

ENV NODE_ENV="production"

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx dist/ .
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]