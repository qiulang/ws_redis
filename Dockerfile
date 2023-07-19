FROM node:18.16-alpine3.18 as build-stage
WORKDIR /app
COPY package.json ./
# COPY yarn.lock ./
COPY .npmrc ./
RUN npm install
RUN npm config set unsafe-perm true
COPY . .
RUN npm run build
# RUN rm -r node_modules
RUN npm prune --production

FROM node:18.16-alpine3.18 as prod
# RUN apk add --no-cache --repository https://mirrors.aliyun.com/alpine/v3.14/main/ redis bash tzdata inotify-tools supervisor
RUN apk add --no-cache --repository https://mirrors.aliyun.com/alpine/v3.18/main/ redis bash tzdata
RUN sed -i 's/bind 127.0.0.1 -::1/# bind 127.0.0.1 -::1/g; s/protected-mode yes/protected-mode no/' /etc/redis.conf
ENV TZ=Asia/Shanghai
WORKDIR /app
# npm 8 will do npm install --only=prod
ENV NODE_ENV production
COPY --from=build-stage /app /app
# RUN npm install --only=prod
EXPOSE 3000 6379
CMD ["npm", "run", "pm2.5"]
# CMD ["npm", "run", "start"]
