FROM node:16.14.2-alpine3.15
RUN apk add --no-cache --repository https://mirrors.aliyun.com/alpine/v3.14/main/ redis bash tzdata
RUN sed -i 's/bind 127.0.0.1 -::1/# bind 127.0.0.1 -::1/g; s/protected-mode yes/protected-mode no/' /etc/redis.conf
ENV TZ=Asia/Shanghai
WORKDIR /node
COPY package.json ./
# COPY yarn.lock ./
COPY .npmrc ./
# ENV NODE_ENV production
RUN npm config set registry https://registry.npmmirror.com
#RUN npm install -g npm@latest
RUN npm install --only=prod
# RUN yarn
RUN npm config set unsafe-perm true
RUN npm install typescript -g
COPY . .
RUN npm run build
EXPOSE 3000 6379
CMD ["npm", "run", "pm2.5"]
