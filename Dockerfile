FROM node:14-alpine3.14
RUN apk add --no-cache --repository https://mirrors.aliyun.com/alpine/v3.14/main/ redis bash tzdata
ENV TZ=Asia/Shanghai
WORKDIR /node
COPY package*.json ./
COPY yarn.lock ./
ENV NODE_ENV production
# RUN npm install --only=prod
RUN npm config set registry https://registry.npm.taobao.org
# RUN npm install
RUN yarn
RUN npm config set unsafe-perm true
RUN npm install pm2 typescript -g
COPY . .
RUN npm run build
EXPOSE 80
CMD ["npm", "run", "pm2.5"]