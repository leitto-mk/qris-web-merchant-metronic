FROM node:20-alpine AS build-stage

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --legacy-peer-deps

COPY . .

RUN npm run build

FROM nginx:stable-alpine AS production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

RUN sed -i '/<head>/a <meta name="app_url" content="<!--# echo var=\"nginx_ssi_url\" -->">' /usr/share/nginx/html/index.html \
 && sed -i '/<head>/a <meta name="app_env" content="<!--# echo var=\"nginx_ssi_env\" -->">' /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
