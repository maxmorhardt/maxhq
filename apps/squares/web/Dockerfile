FROM --platform=linux/arm64 nginx:alpine

ENV NODE_ENV="production"

COPY dist/ /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]