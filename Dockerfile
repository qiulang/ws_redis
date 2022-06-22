FROM node:16.14.2-alpine3.15
# RUN apk add --no-cache --repository https://mirrors.aliyun.com/alpine/v3.14/main/ redis bash tzdata inotify-tools supervisor
RUN apk add --no-cache --repository https://mirrors.aliyun.com/alpine/v3.15/main/ redis bash tzdata
RUN sed -i 's/bind 127.0.0.1 -::1/# bind 127.0.0.1 -::1/g; s/protected-mode yes/protected-mode no/' /etc/redis.conf
ENV TZ=Asia/Shanghai
WORKDIR /node
COPY package.json ./
# COPY yarn.lock ./
COPY .npmrc ./
RUN npm config set registry https://registry.npmmirror.com
# RUN npm install --only=prod
RUN npm install
# RUN yarn
RUN npm config set unsafe-perm true
COPY . .
RUN npm run build
RUN npm prune --production
EXPOSE 3000 6379
ENV NODE_ENV production
CMD ["npm", "run", "pm2.5"]
# CMD ["npm", "run", "start"]
