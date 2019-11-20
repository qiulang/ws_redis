### 写 redis的 pubsub例子

redis nodejs 客户端我们用ioredis,  https://github.com/NodeRedis/node_redis 上一次更新半年前，这里提到[pub/sub问题](https://cnodejs.org/topic/56835f18b9de25e81e01c211) 我们又恰好要用[pubsub](https://github.com/luin/ioredis#pubsub)

它也是用debug记录消息

[pubsub 消息是不存的](https://stackoverflow.com/questions/18079951/does-redis-pub-sub-persist-historical-messages-in-a-channel)

> The pub/sub messages are not queued, and even less persisted.
>
> They are only buffered in the socket buffers, and immediately sent to the subscribers in the same event loop iteration as the publication.
>
> If a subscriber fails to read a message, this message is lost for the subscriber.

[Redis Best Practices pubsub](https://redislabs.com/redis-best-practices/communication-patterns/pub-sub/)   **"These messages are fire-and-forget"**  Once subscribed to a channel, the client is put into subscriber mode and no commands can be issued by the client. In this way, the client has become read-only. 




[channel 也不需要专门做创建和删除](https://www.redisgreen.net/blog/pubsub-howto/)

> Channels exist on the system only when a subscriber is listening to messages on it, so there is no need to ever “create” or “remove” channels – they exist only while a subscriber is listening. 



连别的服务器

```shell
redis-cli -h host -p port -a password
```

Socket.io + redis pubsub

1. https://stackoverflow.com/questions/10557826/node-js-socket-io-redis-pub-sub-high-volume-low-latency-difficulties?rq=1
2. https://stackoverflow.com/questions/6192177/redis-pub-sub-with-reliability?rq=1
3. https://stackoverflow.com/questions/5903328/pub-sub-implementation-in-nodejs?rq=1



开始写socket.io + redis pubsub 如果需要可以借鉴下 
1. https://github.com/steffenwt/nodejs-pub-sub-chat-demo
2. https://scalegrid.io/blog/using-redis-with-node-js-and-socket-io/



chat 例子一开始没跑起应该 socket.io client版本问题。另，开了蓝灯也没问题。



### 实现socket.io 

每个client连接在它自己缺省的 room，连接后发登录消息，服务器收到登录消息往这个房间发一个确认。

重刷浏览器，或者服务器重启，浏览器端 socket.id 会变，服务器端需要有一个方法能唯一标识浏览器端，即同一个坐席

[ 用户关闭页面，断网都会触发disconnect消息](https://stackoverflow.com/questions/16293520/how-to-detect-that-users-connection-is-lost-or-he-closed-the-browser-window-in)

`emit` 缺省是群发

[socket.io 所有事件](https://stackoverflow.com/questions/24224287/list-of-socket-io-events) 总结的是1.3版本 现在2.3版本 服务器端有disconnect



关于socket.io启动 http server 和 express的不同

1. https://stackoverflow.com/questions/26921117/http-createserverapp-v-http-serverapp

2. https://stackoverflow.com/questions/27492101/what-is-happening-when-requirehttp-server-is-evaluated-with-an-express-app

关于关闭页面，断网 socket.io的处理

1. https://stackoverflow.com/questions/16293520/how-to-detect-that-users-connection-is-lost-or-he-closed-the-browser-window-in

#### 目前socket.io 的设计

**redis 数据**

1. `socket_user ` 哈希表 存 `socket.id` 到 `user_id`映射 ： 客户端成功连接到服务器就发`login`事件（自定义事件），消息内容是 `user_id`, 服务器收到 `login`事件，在redis的`socket_user `表添加一对`key:value`对 `socket.id`： `user_id` 
2. 服务器对每个登录`sub.subscribe(user_id)` , 即为每个坐席建立一个通道，订阅从web服务器发来消息。
3. 维护`socket_user `哈希表目的是 当断线时候, 服务器会收到`disconnet`事件（包括网络问题、关闭页面）从 `socket.id` 知道相应`user_id`，更新 `user_id` 哈希表的相关数据
4. 每个坐席登录后为它创建哈希表 key 是 `user_id`, 用它来存所有跟这个坐席相关信息。每个坐席有自己的哈希表。坐席存socket.id的目的是 sub收到消息,后通过channel取到对应 socket.io.  因为socket.id存在两个地方，用transcation 保证他们是一样的。
5. redis的pub目前只用在用户下线， websocket 服务器往公共通道 `seat_message_channel` 发下线消息通知web服务器。其他客户端的上传消息web服务器希望直接从浏览器调用http接口，而不是通过 websocket服务器pub方式通知web服务器。
6. redis-cli里发送json数据要这样 `publish 134_243_1000998392 '{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,"data":{"number":"1056","status":1}}'`  最外面是单引号，每个json的key值是双引号。



注：

1. pubsub 必须要两个redis示例，因为 `(node:80054) UnhandledPromiseRejectionWarning: Error: Connection in subscriber mode, only subscriber commands may be used` 
2. 连别的机器redis最简单办法 在他的redis-cli 运行 `CONFIG SET protected-mode no` 



> (error) DENIED Redis is running in protected mode because protected mode is enabled, no bind address was specified, no authentication password is requested to clients. In this mode connections are only accepted from the loopback interface. If you want to connect from external computers to Redis you may adopt one of the following solutions: 1) Just disable protected mode sending the command 'CONFIG SET protected-mode no' from the loopback interface by connecting to Redis from the same host the server is running, however MAKE SURE Redis is not publicly accessible from internet if you do so. Use CONFIG REWRITE to make this change permanent. 2) Alternatively you can just disable the protected mode by editing the Redis configuration file, and setting the protected mode option to 'no', and then restarting the server. 3) If you started the server manually just for testing, restart it with the '--protected-mode no' option. 4) Setup a bind address or an authentication password. NOTE: You only need to do one of the above things in order for the server to start accepting connections from the outside.



**socket.io 事件**

1. socket.io系统事件要处理

2. 我们自定义事件目前只有两个： `login`（客户端发，服务器收） 和 `cr_msg` （服务器发，客户端收）

3. `login`在客户端websocket连到服务器后发送，服务器负责监听，作用是把`userid`发给服务器，以便服务器把`userid` 和`socketid` 做绑定。 服务器处理login消息之后会给客户端一个相应。

4. 客户端需要监听`cr_msg`事件，收到的消息体是服务器下发给浏览器各种消息。

  

http 服务器和websocket 服务器监听不同端口的方法暂时没试出来，但目前也不需要



### 部署方案和nginx设置

客户端的 io创建 `io([url][, options])` , url (String) (defaults to **window.location**)

1. 和前端起在一起，共用前端nginx. 前端的socket.io client 连到和页面一样同一个web 服务器（前端的nginx），配置最简单。但需对nginx转发规则做专门配置？
2. 和后端起在一起，共用后端nginx. [Ratchet的推荐方式](http://socketo.me/docs/deploy) 前端的socket.io client 连到和页面**不同的**一个web 服务器。
3. 自己单独起，甚至可以不用nginx 来转发，可能比第二种更麻烦，因为不仅前端的socket.io client 连到和页面**不同的**一个web 服务器，[可以参照url options](https://socket.io/docs/client-api/#io-url-options)  “if the `url` is `http://localhost/users`, a transport connection will be established to `http://localhost` and a Socket.IO connection will be established to `/users`.”  但暂时没时间试。

所以决定采用和前端在一个容器里，下一步难点：

1. 如何生成前端docker 镜像。
2. nginx.conf配置， 静态文件 通过nginx还是express输出？`location` 转发规则？
3. 保证和后端共用一个redis



 socket.io client 能连和express 服务器不同的端口吗？ **不能**

[what port does the socketIO client listen to by default?](https://stackoverflow.com/questions/25778414/what-port-does-the-socketio-client-listen-to-by-default) 从这个答复再加参看源代码，socket.io client连服务器监听端口， 所以nginx的转发规划要怎么做？！

根据这两个问答，终于找到解决办法 

[Express + Nginx. Can't serve static files](https://stackoverflow.com/questions/46692341/express-nginx-cant-serve-static-files)

[Serve both static website & SPA (node.js) with NGINX](https://stackoverflow.com/questions/54422629/serve-both-static-website-spa-node-js-with-nginx)

关键是  https://serverfault.com/questions/738452/what-does-the-at-sign-mean-in-nginx-location-blocks

```shell
    location / {
        try_files $uri $uri/ @websocket; #注意 @必须
    }
```



静态文件还是用nginx转发更有效，[参见nginx对 socket.io描述的官方文档](https://www.nginx.com/blog/nginx-nodejs-websockets-socketio/)

[socket.io 官方文档关于 sticky session描述](https://socket.io/docs/using-multiple-nodes/#NginX-configuration) 现阶段只起一个nodejs还不需要 sticky session.



### nginx 配置规则要点



1. 当两个SPA放在一起通过路径区分时，必须要在[vue.config.js 要配置 publicPath](https://cli.vuejs.org/zh/config/#publicpath) . 延伸阅读 https://stackoverflow.com/questions/2005079/absolute-vs-relative-urls , 但即使把index.html路劲手动修正确，SPA一样不显示。不值得研究了。

2. [root 和 alias 区分很重要](https://stackoverflow.com/questions/10631933/nginx-static-file-serving-confusion-with-root-alias) 我们必须用alias, 并针对 publicPath的值设置。子路径用 alias不用root, 但 "/" 如果用alias，路径结尾必须有 `/`

3. [location 一些规则](https://www.digitalocean.com/community/tutorials/understanding-nginx-server-and-location-block-selection-algorithms)

4. 可以单独对 socket.io 设置 location，这样就不需要 `@websocket ` 做 fallback。

5. 如果单独对 socket.io 设置location， [SPA就可以用history mode](https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations) 用 `index.html` 做 fallback. 

6. [location 做 path match的时候， websocket连不上，暂时无解](https://stackoverflow.com/questions/58668373/socket-io-with-nginx-location-path-match-hit-the-error-during-websocket-handsha)

   

### dockerfile 难点



我们需要在一个容器里部署 websocket 服务器，两个 SPA 应用， dockerfile如何生成？ 

网上查不到有用资料，[最近接就是一个nodejs服务器+一个SPA](https://stackoverflow.com/questions/54996835/docker-design-for-multiple-apps)。 先从两个SPA做起或者是一个SPA和一个nodejs做起。

如何能访问两个项目文件? 目前决定用 `git subtree`. 父仓库如何取到 subtree 仓库最新代码，或者切换分支？

已经验证可以跑起来两个 SPA，下一步把nodejs也加下



#### 如何把nginx 和 nodejs 放在一个容器里 ？

如果用 `docker-compose.yml` 设置 nginx 容器 `depends_on`  , docker-compose建立的虚拟网络里, nginx 容器就可以通域名nodejs ，所以 nginx.conf 可以直接写 `proxy_pass http://nodejs:8080;` 

k8s 是不是也能这样，我现在不清楚。



但是要把 nginx 和 nodejs编在一个容器里，网上没看到资料。就直接在nginx容器里安装nodejs吧，注意 alpine的安装方法：

1. https://www.sandtable.com/reduce-docker-image-sizes-using-alpine/

2. https://stackoverflow.com/questions/49118579/alpine-dockerfile-advantages-of-no-cache-vs-rm-var-cache-apk

3. 安装使用阿里镜像快很多 `RUN apk add --no-cache --repository https://mirrors.aliyun.com/alpine/v3.9/main/ nodejs npm`

4. alphine [容器带 cron job](https://medium.com/@allanlei/running-cron-in-docker-the-easy-way-4f779bfa9ca7) 但要注意不是每个Linux的基础镜像都有 cron job

    

`pm2`   `git subtree` 都还要再找时间复习下

#### vscode debug

- [x] 好久没用有些设置又变了  https://code.visualstudio.com/docs/nodejs/nodejs-debugging


- [x] [pm2 的log](https://pm2.keymetrics.io/docs/usage/log-management/)

- [x] pm2 如何和debug 一起，网上能找到几个资料都不行。


      1. https://stackoverflow.com/questions/46117380/how-to-start-pm2-process-with-debug-option
    
      2. https://github.com/visionmedia/debug/issues/503
    
      3. https://github.com/Unitech/pm2/issues/1757

先暂时放弃 pm2的使用

注，pm2 和 debug使用见下面总结。

- [x] JSON.parse异常处理要加上。 合法的json串，最外面是单引号，每个属性双引号。


- [x] repo 改名  https://stackoverflow.com/questions/2041993/how-do-i-rename-a-git-repository
- [x] nginx log 和时区的设置还要确认
- [x] 用密码方式访问 redis



### 启动 redi-server 几个注意点 

1. 启动 `redis-server` 不带任何参数，启动后输出：

   ```shell
   Warning: no config file specified, using the default config. In order to specify a config file use redis-server /path/to/redis.conf
   
   /* the default config*/ 所以redis处在 protected-mode 并且不使用密码
   
   127.0.0.1:6379> config get protected-mode
   1) "protected-mode"
   2) "yes"
   127.0.0.1:6379> config get requirepass
   1) "requirepass"
   2) ""
   
   127.0.0.1:6379> info server //看基本配置
   # Server
   redis_version:5.0.3
   ...
   config_file:/usr/local/etc/redis.conf
   
   // config rewrite 是先 config set 然后直接输入 config rewrite
   127.0.0.1:6379> config set requirepass "jiajia"
   OK
   127.0.0.1:6379> config rewrite
   OK
   
   However if the server was started without a configuration file at all, the CONFIG REWRITE will just return an error.
   ```

2. protect-mode  https://redis.io/topics/security#protected-mode  3.2.0 才有的功能

   > since version 3.2.0, when Redis is executed with the default configuration (binding all the interfaces) and without any password in order to access it, it enters a special mode called **protected mode**. In this mode Redis only replies to queries from the loopback interfaces, and reply to other clients connecting from other addresses with an error, explaining what is happening and how to configure Redis properly.

protect-mode 是针对没有设置密码时候提供的**额外保护**，这时只能从本机访问。

如果设置了密码，即便有 protect-mode, 别的机器通过auth也能访问

```
redis ➤ redis-cli                                                                            127.0.0.1:6379> config set requirepass "tongtong"
OK
127.0.0.1:6379> config rewrite
(error) NOAUTH Authentication required.
127.0.0.1:6379> config get protected-mode
(error) NOAUTH Authentication required.
127.0.0.1:6379> auth "tongtong"
OK
127.0.0.1:6379> config get protected-mode
1) "protected-mode"
2) "no"
```



3. 配置文件如果设置 `bind 127.0.0.1 ::1` 就只能本机访问， 别的机器访问会提示 "Connection refused"



### 11.08 发现几个问题

1. 今天提交的客户端代码， 重新刷新页面 socket.io 有时候不通！重启socket.io服务器可以连上。查了半天发现 `socket.on('connect' ...` 的代码必须和 `socket = io()`  在同一个文件
2. 基于 alpine 的docker容器的时区问题， CST
3. 32服务器部署要打开防火墙，不然websocket 不通；阿里云部署 wss不需要专门配置
- [x] 4. 测试问题，同一账户在不同机器登录，消息会发到哪个浏览器，当然是最后一个，而且我们还要踢下线之前的
- [x] 5. 需要支持 IE 11 参考这个 [git issue](https://github.com/socketio/socket.io-client/issues/1328)  由此发现不能使用socket.io 2.3 只能用 socket.io 2.2 或2.1

     

### pm2 使用

1. 使用 ecosystem 文件
2. 启动带 `--env development` 反而有[输出警告](https://github.com/Unitech/pm2/issues/3698) 
3. 清理日志 `pm2 flush` 
4. `DEBUG=app:* pm2 start index.js`  但是写到package.json 的脚本 [debug设置必须写在ecosystem里](https://stackoverflow.com/questions/46117380/how-to-start-pm2-process-with-debug-option/58798320#58798320)；
5. 使用debugjs有几个问题：
   1. [日志写到 index-error.log](https://github.com/visionmedia/debug/issues/503) 
   2. 时区设置, 非 tty时候，debug 缺省用 Date#toISOString() ，不知道怎么设置本地时区，发现我很久前就给它[开过问题单](https://github.com/visionmedia/debug/issues/574)，没答复。 另一个问题单说可以[定制输出格式，包括时区](https://github.com/visionmedia/debug/issues/582) 但我试了半天[没试验出来，原来是作者还未实现](https://github.com/visionmedia/debug/issues/708), 干脆不要它的时间戳，用pm2的
6. pm2 log rotate设置
7. websocket 下线要通知服务器,同个账号多次登录也要通知
8. IE11的问题，目前看是debug v4 引起的，改用 debug v3 就好了，为啥也不清楚，[总结在这](https://forum.vuejs.org/t/i-cant-polyfill-debug-module-version-4-for-ie-11-but-version-3-works-just-fine/79548)



### 处理重连和重复登录问题

1. 目前改成每次清单都清掉所有redis数据，出发点是浏览器重来会再更新所有数据

2. websocket:socket_user 和 websocket:${user_id} 不要都存 socket_id, 存在websocket:socket_user 就可以

3. `PUBSUB CHANNELS` 看当前订购了哪些通道. 调试哪个通道有问题,一般先执行

   ```shell
   bash-4.4# redis-cli -h emic-cm-redis.redis.rds.aliyuncs.com -p 6379 -a Sinicnet123456
   Warning: Using a password with '-a' option on the command line interface may not be safe.
   emic-cm-redis.redis.rds.aliyuncs.com:6379> PUBSUB CHANNELS
   1) "134_243_1000962325"
   2) "134_243_1000056188"
   3) "seat_message_channel"
   4) "134_243_1000964617"
   5) "134_243_1000960367"
   ```

   

4. IE 11 问题， debug没转码，[给bablel开的问题单回复了](https://github.com/babel/babel/issues/10707)，但debug的维护者一直很不耐烦

5. - [ ] channel 是否需要unsubscribe 实际生产环境肯定需要。[根据这个SO](https://stackoverflow.com/questions/10142246/how-to-design-redis-pub-sub-for-an-instant-messaging-system) 连接达到上限就不再接受新连接：

   ```shell
   config get maxclients //当前设置10000暂时还达不到
   info stat //有一项 pubsub_channels 不知道怎么单独看
   pubsub_channels:xxx
   ```


6. - [ ] pm2 的日志要写的nas盘，不然容器重启就没了！
7. - [ ] 目前代码加的判断key是否 exists，如果不存在set expire看来没起到串行效果，set expire还是被调用两次 
8. [no empty hash in redis](https://stackoverflow.com/questions/21283042/keep-empty-data-keys-in-redis)
9. dump.rdb对我们到底有用吗？

