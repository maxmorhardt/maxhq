FROM nginx:alpine@sha256:a3554c0d0b48177b1413c26e01f695334428020d9df01243fbae3e11cfd17417

LABEL io.maxhq.image.source="https://github.com/maxmorhardt/maxhq"
LABEL io.maxhq.image.description="maxhq - Personal portfolio web application"
LABEL io.maxhq.image.vendor="Max Morhardt"
LABEL io.maxhq.image.licenses="Apache-2.0"

RUN apk upgrade --no-cache

ENV NODE_ENV="production"

WORKDIR /usr/share/nginx/html

COPY --chown=nginx:nginx dist/client/ .
COPY --chown=nginx:nginx nginx.conf /etc/nginx/conf.d/default.conf

USER nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
