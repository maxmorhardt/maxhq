FROM nginx:alpine

LABEL io.maxstash.image.source="https://github.com/maxmorhardt/maxstash"
LABEL io.maxstash.image.description="Maxstash - Personal portfolio web application"
LABEL io.maxstash.image.vendor="Max Morhardt"
LABEL io.maxstash.image.licenses="Apache-2.0"

RUN apk upgrade --no-cache

ENV NODE_ENV="production"

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx dist/client/ .
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
