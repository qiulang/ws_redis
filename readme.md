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



#### stream

redis 5.0 引入 stream，它和pub sub 一点区别就是 pub sub 消息不保存，stream保存 "historical messages"

因为我们环境使用redis 4.0，而且 pub sub 目前能满足需求，所以没有进一步研究stream, [可参考](https://www.alibabacloud.com/blog/redis-streams-redis-5-0s-newest-data-type_593816)



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



### websocket

[WebSocket vs socket.io](https://stackoverflow.com/questions/10112178/differences-between-socket-io-and-websockets)

[Moving from socket.io to raw websockets?](https://stackoverflow.com/questions/38546496/moving-from-socket-io-to-raw-websockets) 回答其实是列出socket.io 比原生websocket提供的功能

[Which websocket library to use with Node.js?](https://stackoverflow.com/questions/16392260/which-websocket-library-to-use-with-node-js)

[8 Node.js Web Socket Libraries for 2019](https://blog.bitsrc.io/8-node-js-web-socket-libraries-for-2018-818e7e5b67cf)

如果不用socket.io 可以试试 [ws](https://github.com/websockets/ws) 它比socket.io的一个优势是一直在维护。[但如果没有提供像 socket.io-redis  这样用来处理docker 部署的库](https://github.com/websockets/ws/issues/1712)，使用会是大问题，目前没时间研究。注：见下面补充 websocket client

[Ratchet部署文档](http://socketo.me/docs/push) , websocket 服务器和web服务器通信 它用ZeroMQ， 用RabbitMQ也类似，但我们不要再引入一个mq，[它的使用方式](https://www.cloudamqp.com/blog/2015-05-19-part2-2-rabbitmq-for-beginners_example-and-sample-code-node-js.html) 和 [redis 的 pubsub](https://redis.io/topics/pubsub) 乍一看也太大区别，就用[redis的pubsub](https://stackoverflow.com/questions/32743754/using-redis-as-pubsub-over-socket-io) 



注：socket.io始终是第一选择，而且作者也确保还在开发中 https://github.com/socketio/socket.io/issues/3311

v3 roadmap https://github.com/socketio/socket.io/issues/3250

[Everything You Need To Know About Socket.IO](https://www.ably.io/concepts/socketio) 几个模块介绍



#### websocket 的url 能带 query string吗 ？

12.5 号调试江西建行的项目碰到一个新问题 websocket 的url 能带 query string吗  ?

[Can WebSocket addresses carry parameters?](https://stackoverflow.com/questions/17301269/can-websocket-addresses-carry-parameters) 提到 `ws://myserver.com/path?param=1` is a valid WebSocket URI. **However**, the way that your WebSocket server application can access the path and query string will differ depending on what WebSocket server framework you are using. 

也就是说要看 WebSocket server 有处理吗。

[how to get parameters from websocket client request](https://stackoverflow.com/questions/44781301/how-to-get-parameters-from-websocket-client-request) 提供了服务器处理的一个示例。



### 采用socket.io 

每个client连接在它自己缺省的 room，连接后发登录消息，服务器收到登录消息往这个房间发一个确认。

重刷浏览器，或者服务器重启，浏览器端 socket.id 会变，服务器端需要有一个方法能唯一标识浏览器端，即同一个坐席

[ 用户关闭页面，断网都会触发disconnect消息](https://stackoverflow.com/questions/16293520/how-to-detect-that-users-connection-is-lost-or-he-closed-the-browser-window-in)

`emit` 缺省是群发

[socket.io 所有事件](https://stackoverflow.com/questions/24224287/list-of-socket-io-events) 总结的是1.3版本 现在2.3版本 服务器端有disconnect



**关于socket.io启动 http server 和 express的不同**

1. https://stackoverflow.com/questions/26921117/http-createserverapp-v-http-serverapp

2. https://stackoverflow.com/questions/27492101/what-is-happening-when-requirehttp-server-is-evaluated-with-an-express-app

**关于关闭页面，断网 socket.io的处理**

1. https://stackoverflow.com/questions/16293520/how-to-detect-that-users-connection-is-lost-or-he-closed-the-browser-window-in

**关于socket.io发的payload，前面那一串数字到底什么含义** 参见 [What do these numbers mean in socket.io payload?](https://stackoverflow.com/questions/24564877/what-do-these-numbers-mean-in-socket-io-payload) 这是socket.io实现细节，用来表示发送的消息是什么类型消息。[具体参见](https://github.com/socketio/engine.io-protocol#packet):

An encoded packet can be UTF-8 string or binary data. The packet encoding format for a string is as follows

```
<packet type id>[<data>]
//The packet type id is an integer
0 open
1 close
2 ping
3 pong
4 message
...
```

具体的通信协议 https://github.com/socketio/socket.io-protocol

在docker容器使用 socket.io一定要用  socket.io-redis 包：因为有多个docker，~~同一个浏览器发来的websocket消息可能被分发到不同的docker容器处理。~~ 上面这句描述应该是错误，使用websocket，同一个消息会发到同一个docker容器，我们的问题是 redis sub 处理可能在另一个容器。



### 目前socket.io 的设计

**redis 数据**

1. `socket_user ` 哈希表 存 `socket.id` 到 `user_id`映射 ： 客户端成功连接到服务器就发`login`事件（自定义事件），消息内容是 `user_id`, 服务器收到 `login`事件，在redis的`socket_user `表添加一对`key:value`对 `socket.id`： `user_id` 
2. 服务器对每个登录`sub.subscribe(user_id)` , 即为每个坐席建立一个通道，订阅从web服务器发来消息。
3. 维护`socket_user `哈希表目的是 当断线时候, 服务器会收到`disconnet`事件（包括网络问题、关闭页面）从 `socket.id` 知道相应`user_id`，更新 `user_id` 哈希表的相关数据
4. 每个坐席登录后为它创建哈希表 key 是 `user_id`, 用它来存所有跟这个坐席相关信息。每个坐席有自己的哈希表。坐席存socket.id的目的是 sub收到消息,后通过channel取到对应 socket.io.  因为socket.id存在两个地方，用transcation 保证他们是一样的。
5. redis的pub目前只用在用户下线， websocket 服务器往公共通道 `seat_message_channel` 发下线消息通知web服务器。其他客户端的上传消息web服务器希望直接从浏览器调用http接口，而不是通过 websocket服务器pub方式通知web服务器。
6. redis-cli里发送json数据要这样 `publish 134_243_1000998392 '{"op_code":"change_status","ccgeid":243,"seid":134,"uid":1000056188,"data":{"number":"1056","status":1}}'`  最外面是单引号，每个json的key值是双引号。



注：

1. pubsub 必须要两个redis实例，因为 `(node:80054) UnhandledPromiseRejectionWarning: Error: Connection in subscriber mode, only subscriber commands may be used` 
2. 连别的机器redis最简单办法 在他的redis-cli 运行 `CONFIG SET protected-mode no` 



> (error) DENIED Redis is running in protected mode because protected mode is enabled, no bind address was specified, no authentication password is requested to clients. In this mode connections are only accepted from the loopback interface. If you want to connect from external computers to Redis you may adopt one of the following solutions: 1) Just disable protected mode sending the command 'CONFIG SET protected-mode no' from the loopback interface by connecting to Redis from the same host the server is running, however MAKE SURE Redis is not publicly accessible from internet if you do so. Use CONFIG REWRITE to make this change permanent. 2) Alternatively you can just disable the protected mode by editing the Redis configuration file, and setting the protected mode option to 'no', and then restarting the server. 3) If you started the server manually just for testing, restart it with the '--protected-mode no' option. 4) Setup a bind address or an authentication password. NOTE: You only need to do one of the above things in order for the server to start accepting connections from the outside.



**socket.io 事件**

1. socket.io系统事件要处理

2. 我们自定义事件目前只有两个： `login`（客户端发，服务器收） 和 `cr_msg` （服务器发，客户端收）

3. `login`在客户端websocket连到服务器后发送，服务器负责监听，作用是把`userid`发给服务器，以便服务器把`userid` 和`socketid` 做绑定。 服务器处理login消息之后会给客户端一个相应。

4. 客户端需要监听`cr_msg`事件，收到的消息体是服务器下发给浏览器各种消息。

5. [这些系统事件](https://socket.io/docs/emit-cheatsheet/) 不要和自定义事件重复了

   

http 服务器和websocket 服务器监听不同端口的方法暂时没试出来，但目前也不需要, **注意**：已确认必须相同。



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

[what port does the socketIO client listen to by default?](https://stackoverflow.com/questions/25778414/what-port-does-the-socketio-client-listen-to-by-default) 从这个答复再加参看源代码，socket.io client连服务器监听端口， **所以nginx的转发规划要怎么做？！**

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



1. 当两个SPA放在一起通过路径区分时，必须要在[vue.config.js 要配置 publicPath](https://cli.vuejs.org/zh/config/#publicpath) . 延伸阅读 https://stackoverflow.com/questions/2005079/absolute-vs-relative-urls , 但即使把index.html路劲手动修正确，SPA一样不显示，不值得研究了。设置publicPath的另一个"问题"是 express无法处理打包的文件，即便设置`app.use(express.static('public'))` 到BS打包目录，浏览器会到rep这一级查找文件报错。没有再深入研究。
2. [root 和 alias 区分很重要](https://stackoverflow.com/questions/10631933/nginx-static-file-serving-confusion-with-root-alias) 子路径用 alias不用root, 并针对 publicPath的值设置。, 但 "/" 如果用alias，路径结尾必须有 `/`
3. [location 一些规则](https://www.digitalocean.com/community/tutorials/understanding-nginx-server-and-location-block-selection-algorithms)
4. 可以单独对 socket.io 设置 location，这样就不需要 `@websocket ` 做 fallback。
5. 如果单独对 socket.io 设置location， [SPA就可以用history mode](https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations) 用 `index.html` 做 fallback. 
6. [location 做 path match的时候， websocket连不上，暂时无解](https://stackoverflow.com/questions/58668373/socket-io-with-nginx-location-path-match-hit-the-error-during-websocket-handsha)
7. [alias 含义容易忘](https://serverfault.com/questions/748634/how-to-alias-directories-in-nginx) 
8. @ 用处：Use @ to define a named location, it is configured as request redirection. This is not used for regular request processing. https://www.thegeekstuff.com/2017/05/nginx-location-examples/
9. [如何确认nginx 在运行](https://stackoverflow.com/questions/35220654/how-to-verify-if-nginx-is-running-or-not) , mac 下最简单的方法 `brew services list` 
10. [扫描某个端口使用情况](https://askubuntu.com/questions/538208/how-to-check-opened-closed-ports-on-my-computer) 几条命令，容易忘。（1） `netstat -an | grep 3000` -a all -n number 有些版本有 -p看是哪个进程，但mac版本没有，所以mac我更倾向于用 (2) `lsof -i :3000` (3) nc做端口扫描,比如`nc -zv localhost 3000-3010` 扫描 3000到 3010
11. lsof -i :3000 显示 [*:hbci 表示 "Home Banking Computer Interface"](https://unix.stackexchange.com/questions/346060/tcp-hbci-listen-what-does-hbci-mean?noredirect=1&lq=1) 可以改用`lsof -P -i :3000` 
12. gzip 之前一直没开启，这是要开启，[参见](https://betterexplained.com/articles/how-to-optimize-your-site-with-gzip-compression/)。

注： nginx 配置文件不含ssl 部分，这块原本 nginx配置一个难点，但因为我们在阿里云的ssl配置在统一在最外层的负载均衡器（slb），[slb转发到我们容器机器时候已经不加密的数据](https://help.aliyun.com/document_detail/89151.html?spm=a2c4g.11186623.6.750.55291f8bxeHlNG) 。

  ​     

### dockerfile 难点

我们需要在一个容器里部署 websocket 服务器，两个 SPA 应用， dockerfile如何生成？ 

网上查不到有用资料，[最近接就是一个nodejs服务器+一个SPA](https://stackoverflow.com/questions/54996835/docker-design-for-multiple-apps)。 先从两个SPA做起或者是一个SPA和一个nodejs做起。

如何能访问两个项目文件? 目前决定用 `git subtree`. 父仓库如何取到 subtree 仓库最新代码，或者切换分支？

已经验证可以跑起来两个 SPA，下一步把nodejs也加下



#### 如何把nginx 和 nodejs 放在一个容器里 ？

如果用 `docker-compose.yml` 设置 nginx 容器 `depends_on`  , docker-compose建立的虚拟网络里, nginx 容器就可以通域名nodejs ，所以 nginx.conf 可以直接写 `proxy_pass http://nodejs:8080;`  (或者写死ip172.17.0.1，参见  [Load Balancing Node.js Applications with NGINX and Docker](https://auth0.com/blog/load-balancing-nodejs-applications-with-nginx-and-docker/))

k8s 是不是也能这样，我现在不清楚。但总之 nginx和websocket 服务器如果分属两个容器，如何访问终究是个问题。

**决定把把 nginx 和 nodejs编在一个容器里**，用pm2来管理nodejs进程（详见下面pm2章节）

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
4. 测试问题，同一账户在不同机器登录，消息会发到哪个浏览器，当然是最后一个，而且我们还要踢下线之前的
5. 需要支持 IE 11 参考这个 [git issue](https://github.com/socketio/socket.io-client/issues/1328)  由此发现不能使用socket.io 2.3 只能用 socket.io 2.2 或2.1

     

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
9. 我曾经的问题 [sticky session 和 pm2 的使用](https://stackoverflow.com/questions/46891819/how-to-make-sticky-session-works-with-socket-io-w-or-w-o-pm2)



关于使用pm2, [Top 4 Tactics To Keep Node.js Rockin’ in Docker](https://www.docker.com/blog/keep-nodejs-rockin-in-docker/) 建议不要用

> Don’t Use Process Managers In Production 
> ...
>
> Docker, Swarm, and Kubernetes will do the job of running healthchecks and restarting or recreating your container if it fails. It’s also now the job of orchestrators to scale the number of replicas of our apps, which we used to use tools like pm2 and forever for.

以前做在线客服就有这个困惑，后来没用pm2. 我们这次用pm2一个原因其实是因为把 nginx做docker主进程，所以node就有在后台起（反过来当然也行）。但使用pm2 不要用cluster mode

[what is the point of using pm2 and docker together?](https://stackoverflow.com/questions/51191378/what-is-the-point-of-using-pm2-and-docker-together)  这个讨论也可以看看




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

5. channel 是否需要unsubscribe 实际生产环境肯定需要。[根据这个SO](https://stackoverflow.com/questions/10142246/how-to-design-redis-pub-sub-for-an-instant-messaging-system) 连接达到上限就不再接受新连接：

   ```shell
   config get maxclients //当前设置10000暂时还达不到
   info stats //有一项 pubsub_channels 不知道怎么单独看
   pubsub_channels:xxx
   ```


6. pm2 的日志要写的nas盘，不然容器重启就没了 已经改成**输出到阿里云日志服务**

7. 目前代码加的判断key是否 exists，如果不存在set expire看来没起到串行效果，set expire还是被调用两次 

8. [no empty hash in redis](https://stackoverflow.com/questions/21283042/keep-empty-data-keys-in-redis)

9. dump.rdb对我们到底有用吗？https://redis.io/topics/persistence#rdb-advantages

10. - [ ] [如何备份 redis数据](https://www.digitalocean.com/community/tutorials/how-to-back-up-and-restore-your-redis-data-on-ubuntu-14-04)，还没时间做。

11. dupCheck 里多个 await ，[每执行await 代码就交出执行权，这样其他event事件能进一步被处理](https://blog.vanila.io/handling-concurrency-with-async-await-in-javascript-8ec2e185f9b4) 所以原来设计 await exists & set 没有达到阻止同个socket.id的多个login事件处理。从日志就可以看出：

    ```shell
    2019-11-21 22:50: app:websocket user 134_243_1000988324, seid:134, ccgeid:243 has login using socket ebwyJu8xkRuvhwMzAAAL
    2019-11-21 22:50: app:websocket user 134_243_1000988324, seid:134, ccgeid:243 has login using socket ebwyJu8xkRuvhwMzAAAL
    2019-11-21 22:50: app:websocket ebwyJu8xkRuvhwMzAAAL will expire in 1 second. Not sure if this helps.
    2019-11-21 22:50: app:websocket ebwyJu8xkRuvhwMzAAAL will expire in 1 second. Not sure if this helps.
    2019-11-21 22:50: app:websocket First time login, subscribe to 134_243_1000988324 channel
    2019-11-21 22:50: app:websocket First time login, subscribe to 134_243_1000988324 channel
    2019-11-21 22:50: app:websocket store in hash table user_socket 134_243_1000988324 => ebwyJu8xkRuvhwMzAAAL
    2019-11-21 22:50: app:websocket store in hash table user_socket 134_243_1000988324 => ebwyJu8xkRuvhwMzAAAL
    ```

    

所以现在直接改存在内存数据 dup 里,但从日志里还是有问题, 因为第二次登录消息把标识位清掉了，接着再来第三个就还是没有标识为！ 

```shell
2019-11-22 19:01:03: app:websocket user 134_243_1000988323, seid:134, ccgeid:243 login using socket PFh2OHUS6ZqNujU9AAAc
2019-11-22 19:01:03: app:websocket First time login, subscribe to 134_243_1000988323 channel
2019-11-22 19:01:03: app:websocket user 134_243_1000988323, seid:134, ccgeid:243 login using socket PFh2OHUS6ZqNujU9AAAc
2019-11-22 19:01:03: app:websocket We get several connect events:134_243_1000988323--PFh2OHUS6ZqNujU9AAAc, return.
2019-11-22 19:01:03: app:websocket user 134_243_1000988323, seid:134, ccgeid:243 login using socket PFh2OHUS6ZqNujU9AAAc
2019-11-22 19:01:03: app:websocket First time login, subscribe to 134_243_1000988323 channel
2019-11-22 19:01:03: app:websocket store in hash table user_socket 134_243_1000988323 => PFh2OHUS6ZqNujU9AAAc
2019-11-22 19:01:03: app:websocket store in hash table user_socket 134_243_1000988323 => PFh2OHUS6ZqNujU9AAAc
```

但是放内存也有问题，因为可能请求是不同docker容器处理。。。

### 没收到下线原因

以后起了多个docker，多个websocket 服务器。登录处理可能是第一台websocket , 但sub 处理可能是另一台服务器，所以发送消息就不成功。必须引入 https://github.com/socketio/socket.io-redis 

https://github.com/socketio/socket.io-redis#custom-client-eg-with-authentication 

> If you need to create a redisAdapter to a redis instance that has a password, use pub/sub options instead of passing a connection string.

```javascript
io.adapter(redisAdapter({ pubClient: pub, subClient: sub }));
```

- [x] 客户端断开连接两个原因 `client namespace disconnect` 和 `transport close` 要区分

### log 的问题

#### express的log

[A Guide to Node.js Logging](https://www.twilio.com/blog/guide-node-js-logging) 提到 server log, library log, CLI log 我不能完全同意，对我们来说都是调试log和服务器log没法完全区分。 `pino-debug` 倒是可以试试。

[Logging: Best Practices for Node.JS Applications](https://blog.bitsrc.io/logging-best-practices-for-node-js-applications-8a0a5969b94c) 推荐用winston，但主要原因 log 分级别，动态改变其实pino也有。

引入 npm install chalk, 主要因为我是颜色控，对几个我觉得比较重要信息都加了颜色。



目前用debug做log主要问题**有两个**： (a) log 不分级别；(b) 没法运行时修改打开的log 下一步任务就是要解决这两个问题。

首先调查了 [pino-debug](https://github.com/pinojs/pino-debug) 但发现 它打出日志真的不是 human readable, `hostname, time, level`在调试时候都没啥用，msg 埋没在这些信息当中，而且也没有颜色。没进一步花时间看解决。

但得到一个启发，把 debug的 namespace 设置成的 log level，运行时候打开哪个namespace 可以用来控制哪个 log level.

运行时候需改log级别， [debug 3就支持](https://github.com/visionmedia/debug#set-dynamically) 所以我们只要提供相应web api就可以在运行时候动态修改。唯一碰到一点小问题，就是 `debug.enable()`会把之前的ns都清空，而且只有 `debug.disable()` 才返回当前的ns

还有不能用chalk，因为pm2的log文件里，chalk的颜色代码都变成 ANSI color codes.



**补充**：pm2 自己也用了 chalk,  `ecosystem.config.js` 设置参数 `DEBUG_COLORS` 和 `args: ['--color']` 作用是一样，都是让chalk 显示颜色，这样pm2的log文件就含了ANSI color codes. 所以`production` 环境要关闭。



#### 总结现在对debug的使用

1. 每个模块的debug信息，ns设置 `app:模块:debug` 这样才能用app:*一起打开。

2. info 和 warn不分模块，不然代码复杂度增加很多。

3. 提供动态修改log级别的接口。

4. debug确实写得std.err, 不做修改了，不然要改的地方太多。pm2就都从 `/root/.pm2/logs/ws-redis-error.log` 看吧

5. 不用chalk

6. `pm2-logrotate` 使用要研究下，目前只修改 `workerInterval `为150秒，确实30查一次没必要。

   
#### nginx的log

[nginx log的缺省位置](https://docs.splunk.com/Documentation/AddOns/released/NGINX/Setupv2) `/var/log/nginx/access.log`  docker容器也是这个位置，但把 access.log重定向到标准输出。

mac下用brew安装的nginx，缺省日志在`/usr/local/var/log/nginx/` 路径下，但如果指定相对路径，比如 `access_log logs/ql.access.log combined if=$loggable;`  实际位置就在 `/usr/local/Cellar/nginx/1.15.8/logs` (注，我本机用 1.1.5.8)

容器里不写绝对路径会，比如 `access_log access.log` 会在 `/etc/nginx/access.log` 

**Conditional logging** 

Conditional logging 如果不设置路径就有问题，在我的机器上会发生log完全不记录。

```nginx
map $request_method $loggable {
    HEAD 0;
    OPTIONS 0;
    default 1;
}
# 或者
map $remote_addr $log_ip {
    #但是如果用容器启动，$remote_addr被映射成容器内地址，所以可能不好用
    "127.0.0.1" 0;
    default 1;
}

```

由于 容器的nginx 重定向到标准输出，所以看日志可以用 `docker logs -f <container id>`




### free port 方便开发

如果3000端口已经使用就用下一个free端口，只在开发时候用,避免`EADDRINUSE` 错误；生成环境不可以，因为nginx规则写死3000

试了几个包 ，选了下载量最大的 portfinder

1. [portfinder](https://www.npmjs.com/package/portfinder)

2. [get-port](https://www.npmjs.com/package/get-port) 应该也可以，但没有portfinder下载量大

3. 其他的包年代都比较就久不考虑，比如 [find-free-port](https://www.npmjs.com/package/find-free-port) 和 [Nodejs random free tcp ports](https://stackoverflow.com/questions/28050171/nodejs-random-free-tcp-ports) 

4. 现在的启动服务器函数 `startServer` 就比express脚手架生成的 www/bin有意义多了

   


### 目前发现几个问题总结

1. 使用 docker 则一定要用 socket.io-redis 

2. 关于core-js 和 lodash差异，[参见](https://github.com/zloirock/core-js/issues/709) core-js是babel用来 polyfill， `lodash` is a set of utility functions.

3. 支持IE就必须用socket.io 2.1 或者2.2， 不能socket2.3 以及 debug 3 

4. - [ ] await时候执行权交回event loop ， 所以防止同一事件多次执行的标志位不要设置在redis里用await， 在内存里，但是这又没法处理请求被两个不同docker处理情况

5. 同一条消息，本机的websocket服务器推一次，浏览器处理一次，没问题；但阿里云服务器有时候两个docker都会推，找到原因，因为没有unsubscribe; 代码已改成一收到disconnect就unsubscribe

6. 浏览器端会处理两次或者四次，因为 `socket.on('cr_msg'`  被调用两次，如何能确保对一个事件只监听一次? 什么时机调用 `removeListener` 合适？ [Is it possible to limit socket.io to have only one listener per event?](https://stackoverflow.com/questions/44570697/is-it-possible-to-limit-socket-io-to-have-only-one-listener-per-event) 存在session storage里，**但是重刷就收不到消息**, 应该是重刷socket.io 换了新的. 现在通过 `    let exist = window.socket.hasListeners('cr_msg')` 来判断。

7. 在线客服项目其实也有针对同一个事件多次监听的处理， [beforeDestroy: removeListeners](https://github.com/icebob/vue-websocket/blob/master/src/index.js)

8. 一个历史问题， vscode为什么看不了node_moduels的代码，而是ts的“模拟代码”，[终于得到解答](https://stackoverflow.com/questions/46893661/go-to-implementation-instead-of-typescript-declaration)

9. - [ ] 处理`SIGTERM` 告知web服务器连接断开。

10. 前端打包代码如何能使用运行时环境变量，[难点参见](https://medium.com/@oprearocks/environment-variables-in-webpack-builds-vs-node-js-apps-bc2b26261e66)， [可能方案参见](https://www.freecodecamp.org/news/how-to-implement-runtime-environment-variables-with-create-react-app-docker-and-nginx-7f9d42a91d70/) 这其实和我们ccfront做法一样。在index.html 引入script [会碰到错误参见](https://forum.vuejs.org/t/add-script-tag-to-index-html/51525)

    

### 12.18发现重复登录一个问题

第一个容器发现同一个账号重复登录，提醒老的websocket下线，删掉老的关联记录。

```javascript
io.to(old_socket).emit('logoff', 'another login')
await redis.hdel('websocket:socket_user', old_socket)
```



但是老的websocket是第二个容器处理的, 因为关联记录已经被删掉，就没法unsubscribe

```javascript
    let user_id = await redis.hget('websocket:socket_user', socket.id)
    if (!user_id) {
      //我们通知客户端下线，客户端调用 socket.close() 原因就是
      debug(
        `No ${socket.id} related data, is it 'client namespace disconnect or 'transport close' ?`
      )
      return
    }
    info(`SUB unsubscribe ${user_id} first.`)
    sub.unsubscribe(user_id)
```



### 12.25 几个问题总结

#### this 指针

 this 指针问题老是搞混的地方，[注意这点](https://stackoverflow.com/questions/3127429/how-does-the-this-keyword-work/17514482#17514482) “object inside object”

vue的 [methods](https://vuejs.org/v2/api/index.html#methods) 和 [watch](https://vuejs.org/v2/api/index.html#watch) 都不要用 箭头函数 , 参考这篇 [5 common problems with Vue.js](https://medium.com/@fadamakis/common-problems-with-vue-js-a5b6da6a1eba)

[`this` undefined in filters](https://github.com/vuejs/vue/issues/5998) 和 [VueJS: why is “this” undefined?](https://stackoverflow.com/questions/43929650/vuejs-why-is-this-undefined)



#### vuex 几个问题

vuex 如何访问 router ， [这里说用 payload](https://github.com/vuejs/vue-hackernews-2.0/issues/171) 但现在估计可以[直接访问](https://stackoverflow.com/questions/40736799/how-to-navigate-using-vue-router-from-vuex-actions) 

vuex 的todo例子， 如果不用箭头函数， this 指向 window； “Arrow functions cannot be used to write object methods” ；但在更复杂日志 this 指向Store，[参见](https://forum.vuejs.org/t/when-will-this-is-set-to-store-object-in-getter-mutations-action-method/82811) 



#### 计算属性作为函数名

计算属性作为函数名, 和定义属性一样加 []

[ES2015之对象计算属性值](https://liunian.github.io/blog/es2015-computed-property-name/)

[The names of functions in ES6](https://2ality.com/2015/09/function-names-es6.html)

[vue中的使用介绍](https://vuex.vuejs.org/guide/mutations.html#using-constants-for-mutation-types)



#### forEach的问题

es5 的 `forEach` 主要有两个问题，所以es6才引入 `for in` 和 `for of` 和 this，也是老忘了

1. [没法break](https://hacks.mozilla.org/2015/04/es6-in-depth-iterators-and-the-for-of-loop/)
2. [没法await](https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop)



#### 字符串转数字方法

[How to convert a string to a number in JavaScript](https://flaviocopes.com/how-to-convert-string-to-number-javascript/) 

**非常规的**   

> use the unary operator `+` before the string
>
> Use `* 1`



### 1.7 问题总结（续）



#### fetch vs Axios

参见这两篇：

1.  [How to make HTTP requests like a pro with Axios](https://blog.logrocket.com/how-to-make-http-requests-like-a-pro-with-axios/)
2. [Axios or fetch(): Which should you use?](https://blog.logrocket.com/axios-or-fetch-api/)

比如 axios 会自动对参数做JSON转化， 返回结果 response.data就是转化的json数据 (可参见我们webrtc工具条)

```javascript
// axios
axios.get('https://api.github.com/orgs/axios')
  .then(response => {
    console.log(response.data);
  }, error => {
    console.log(error);
  });

// fetch()
fetch('https://api.github.com/orgs/axios')
  .then(response => response.json())    // one extra step
  .then(data => {
    console.log(data) 
  })
  .catch(error => console.error(error));
```



#### 同一账号重复登录问题

还是看到日志有 ，但仔细查日子好像都是断开websocket消息，没有对应login消息

```
`No ${socket.id} related data when it disconnected, BUG!!!`
造成没 sub.unsubscribe
```



### 3.3 性能测试

开始性能测试 使用 https://testable.io/ 需要写nodejs脚本，并复习testable的文档

今天写的测试代码 2000个连接没问题，10,000连接会断开，明天接着查

pm2 `max_memory_restart` 这项配置去掉

发现一个问题，如果重复连接发生，而且第一个连接的`disconnect` 事件在第二个连接之后才收到，那就错误的 `sub.unsubscribe(user_id)` 

[Effect of duplicate Redis subscription to same channel name](https://stackoverflow.com/questions/41192541/effect-of-duplicate-redis-subscription-to-same-channel-name)

> Conversely, calling a single unsubscribe will unsubscribe your other subscriptions for that channel/pattern as well.

发现是 nginx worker_connections 缺省1024的问题，改成20K (因为是代理websocket,两个链接才算一个真正websocket)就好了。其他的优化设置没有再深入研究。



### 3.6 sub.unsubscribe 问题

压力测试过程中发现 sub.unsubscribe 有问题：

1. 通常情况，socket连接断开要  `sub.unsubscribe` ，所以 `socket.on('disconnect'` 事件里必须处理一次。
2. commit `fdee291` "两个容器处理同一个账号重复登录发bug，没法  sub.unsubscribe(user_id)" 处理的问题是当重复连接发现 ，即后一个连接在执行 `dupCheck` 时候**不能直接** `redis.hdel('websocket:socket_user', old_socket)`	因为前一个连接可能另一个容器处理的，当前一个连接收到`disconnect`时候要  `sub.unsubscribe`  会找不到 user_id ，因为被删了。当时造成问题就是同一个账号在不同地方登陆，都会收到websocket通知。注：虽然起了两个docker 容器，同一个websocket的请求必定是由同一个ws 服务器处理，这点是保证的。
3. 不能在`dupCheck` 时候就`sub.unsubscribe(user_id)` ，同样是因为可能不是一个容器执行的 `sub.subscribe(user_id)`。 而且因为收到 disconnect 还是要处理。
4. 当时改动基于的现象是处理同一个账号的两个不同连接被分配到**两个不同容器处理**， 一个容器处理完新连接的login请求就会 `sub.subscribe`  而另一个容器处理旧的连接可以**安全**的`sub.unsubscribe` 。
5. 但如果只有**一个服务器在跑**（或者只有一个容器），旧的连接处理`sub.unsubscribe(user_id)` 在新的连接处理 `sub.subscribe`之后，所以会把新连接的订阅也取消 “calling a single unsubscribe will unsubscribe your other subscriptions for that channel/pattern as well.” 。。。
6. 目前的改动方法是把socket和user id的对应在进程内存也维护一份（不止在redis里），在disconnect消息处理时候判断 socket和user id 的对应关系是不是还一样，还一样才 `sub.unsubscribe(user_id)`



### 3.16

#### ws

socket.io 内部使用 ws 实现！！  https://github.com/websockets/ws/issues/1712



### 3.18 

#### 如何使用 cache的问题

[Http 304 & Cache-Control: no-cache](https://stackoverflow.com/questions/8876263/http-304-cache-control-no-cache)

`no-cache` 不是不能使用缓存，而是要revalidate , 但我们的后台代码目前没有提供revalidate机制。

revalidate 有 time-based & content-based 我们应该适合content-based ,就是 Etag

[Increasing Application Performance with HTTP Cache Headers](https://devcenter.heroku.com/articles/increasing-application-performance-with-http-cache-headers)

`If-None-Match` [Don't hurt HTTP: If-(None-)Match & the 412 HTTP status code](https://odino.org/don-t-hurt-http-if-none-match-the-412-http-status-code/) 

php代码要改的，一个是产生etag，一个 检查if none match

[ETag header does not return 304](https://stackoverflow.com/questions/40489289/etag-header-does-not-return-304)



ETag 以W开始 , `W/xxx`  weak Etag

[Caching headers: A practical guide for frontend developers](https://blog.logrocket.com/caching-headers-a-practical-guide-for-frontend-developers/)



**现在的问题axios 如何使用etag**  

只能自己填充 If-None-Match头 [API development: ETags and Conditional Get](https://fideloper.com/api-etag-conditional-get)



另：expressjs 自动设置etag，所以我们曾经碰到是过度缓存问题，现在是一点缓存也没有。[how does a etag work in expressjs](https://stackoverflow.com/questions/24542959/how-does-a-etag-work-in-expressjs)

[How do I return 304 Unmodified status with Express.js?](https://stackoverflow.com/questions/42418503/how-do-i-return-304-unmodified-status-with-express-js)



github open api 可以读下 https://developer.github.com/v3/



### 3.19

[ETag vs Header Expires](https://stackoverflow.com/questions/499966/etag-vs-header-expires)

[How does “304 Not Modified” work exactly?](https://stackoverflow.com/questions/20978189/how-does-304-not-modified-work-exactly)

[Are browsers supposed to handle 304 responses automagically?](https://stackoverflow.com/questions/49751311/are-browsers-supposed-to-handle-304-responses-automagically) **浏览器处理了我们的js代码都可以不用处理!**

~~但是发现 Chrome 80有问题 ，不能正确处理etag, 像是bug，给chrome开了问题单. chrome 为什么不对github使用 If-None-Match ?~~ 

https://bugs.chromium.org/p/chromium/issues/detail?id=1062935

https://stackoverflow.com/questions/60750417/why-doesnt-chrome-use-etag-if-none-match-as-http-protocol-said

没有问题！ **是 disable cache导致, 尴尬了！**

但是 [Why does Chrome show 304 in Response Headers section but 200 in status code?](https://stackoverflow.com/questions/60755020/why-does-chrome-show-304-in-response-headers-section-but-200-in-status-code) 确实很容易让人混淆.



所以今天一整天测试验证结论是，后端通过 laravel 框架设置 etag后，所有前端相应处理浏览器都做了，我们代码不用做什么修改就“坐享其成”！ 只有当代码不跑在浏览器里我们才需要单独处理`etag` 和`If-None-Match`



###websocket client 

小程序websocket尝试连接我们的websocket 服务器失败 `Error during WebSocket handshake: Unexpected response code: 200` 尝试用 [ws](https://github.com/websockets/ws) 连也报错（连ws的服务器没问题）：

```javascript
Error: socket hang up
    at createHangUpError (_http_client.js:322:15)
    at Socket.socketOnEnd (_http_client.js:425:23)
    at Socket.emit (events.js:187:15)
    at endReadableNT (_stream_readable.js:1094:12)
    at process._tickCallback (internal/process/next_tick.js:63:19)
```



查了 ws问题单，发现 [Error: socket hang up](https://github.com/websockets/ws/issues/1390) 终于发现原因:

> You are not connecting to the same path, look at the url in your screenshot and the url you used in the WebSocket constructor, they are not the same.
>
> Also using plain WebSocket to talk with a Socket.IO server does not work seamlessly.



**连接url 不能只写**   `ws://localhost:3000` 必须是 `'ws://localhost:3000/socket.io/?EIO=3&transport=websocket'` 

`EIO=3` 的含义是 https://socket.io/docs/internals/

```
GET wss://myhost.com/socket.io/?EIO=3&transport=websocket&sid=36Yib8-rSutGQYLfAAAD

with:

  "EIO=3"                     # again, the current version of the Engine.IO protocol
  "transport=websocket"       # the new transport being probed
  "sid=36Yib8-rSutGQYLfAAAD"  # the unique session id

```



用了这个完整url后ws连接就成功，但是连接马上就断开了, ~~是不是~~就是ws作者说的 "using plain WebSocket to talk with a Socket.IO server does not work seamlessly." ~~暂时没有再深入研究~~。

```
on message 0{"sid":"YsmSkuo5AJlhkXMJAAAD","upgrades":[],"pingInterval":25000,"pingTimeout":5000}
on message 40
....
服务器端错误信息是
socket id ZSGdCWEfouFeP2N9AAAA has disconnected with reason parse error
```



直接在浏览器用浏览器原生的websocket https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

| Constant               | Value |
| ---------------------- | ----- |
| `WebSocket.CONNECTING` | `0`   |
| `WebSocket.OPEN`       | `1`   |
| `WebSocket.CLOSING`    | `2`   |
| `WebSocket.CLOSED`     | `3`   |

```javascript
var ws = new WebSocket('wss://docker1.emicloud.com/socket.io/?EIO=3&transport=websocket')
//1 表示 open
WebSocket {url: "wss://docker1.emicloud.com/socket.io/?EIO=3&transport=websocket", readyState: 1, bufferedAmount: 0, onopen: null, onerror: null, …} 
//更多代码示例可以参见
https://www.tutorialspoint.com/html5/html5_websocket.htm
```

用浏览器原生的 websocket连接socket.io服务器，和 ws一样错误所以需要研究下!

`socket id E0y-r0Fq0KSzQs0pAAAB has disconnected with reason parse error` 



#### 更新

ws 和 浏览器原生websocket连接 socket.io 服务器都报 `parse error` 肯定是没有处理socket.io的协议，再仔细看socket.io文档**其实写得很清楚**：

> Socket.IO is not a WebSocket implementation. Although Socket.IO indeed uses WebSocket as a transport when possible, it adds some metadata to each packet: the packet type, the namespace and the ack id when a message acknowledgement is needed. That is why a WebSocket client will not be able to successfully connect to a Socket.IO server, and a Socket.IO client will not be able to connect to a WebSocket server (like `ws://echo.websocket.org`) either.

总结这个这些天调查结果 [Why HTML WebSocket access Socket.io web socket server failed?](https://stackoverflow.com/questions/25116394/why-html-websocket-access-socket-io-web-socket-server-failed)

如果要浏览器原生websocket，服务器需要用ws，可以参见 https://lostmoa.com/blog/WebSocketDemoServerInNodeJS/

浏览器原生ws的一大问题是没有断线重连机制:

1.  [Reconnection and KeepAlive](https://github.com/websockets/ws/issues/767)   

   >  That's correct, there is no auto reconnect.

2. https://github.com/websockets/ws#how-to-detect-and-close-broken-connections 



### disconnect的原因 

[5 个disconnect 原因](https://socket.io/docs/server-api/#Event-'disconnect') 通过查现场日志偶尔有 `transport error` 这到底是什么错误原因不明，过去一个断线原因分析

```shell
'has disconnected with reason' 107195
'has disconnected with reason' and 'transport close'  84,841  重刷浏览器
'has disconnected with reason' and 'ping timeout'  17259  网络断线
'has disconnected with reason' and 'client namespace disconnect' 5087  主动下线
'has disconnected with reason' and 'transport error'  8 未知原因
```

https://github.com/socketio/engine.io-protocol#timeouts

> The client must use the `pingTimeout` and the `pingInterval` sent as part of the handshake (with the `open` packet) to determine whether the server is unresponsive.
>
> The server sends a `ping` packet. If no packet type is received within `pingTimeout`, the server considers the socket disconnected. If a `pong` packet is actually received, the server will wait `pingInterval` before sending a `ping` packet again.
>
> Since the two values are shared between the server and the client, the client will also be able to detect whether the server becomes unresponsive when it does not receive any data within `pingTimeout + pingInterval`.



### socket.io 3.x

2021.3.1 发现socket.io 已经从2.3升级到3.x 我们没时间做相应升级。

[Why Socket.IO in 2020?](https://socket.io/blog/socket-io-3-release/)

- auto-reconnection
- a way to broadcast data to a given set of clients (rooms/namespace)
- the Redis adapter to broadcast across Socket.IO servers 对我们最重要，docker使用必须



### ws vs socket.io   cont.

[Building realtime apps with Node.js and WebSockets: client-side considerations](https://ably.com/topic/websockets-nodejs) 长，但文章提到几个考量确实需要花时间再仔细研究下，比如 Authentication 我们在v5实现了， heartbeats 我们再 wssip自己实现了， 断线重连是我们用socket.io一个原因

[Everything You Need To Know About Socket.IO](https://ably.com/topic/socketio) 总结的不如我们自己的总结，这篇更多意义是知道这家公司 [Ably](https://ably.com/topics/protocols) 写了些关于ws的文章。

### 如何确认 ws 消息确实收到

如何能知道ws client收到消息了 [What is the proper way for the socket.io server to know the client actually receives its emit message?](https://github.com/socketio/socket.io/discussions/3846) 作者给了答复就是下面方法，但是timeout取多大好

在 socket.io 3.0的文档找到一个答案 https://socket.io/docs/v3/emitting-events/  可以适当考虑引入

> Timeout are not supported by default, but it is quite straightforward to implement:

```
const withTimeout = (onSuccess, onTimeout, timeout) => {
  let called = false;

  const timer = setTimeout(() => {
    if (called) return;
    called = true;
    onTimeout();
  }, timeout);

  return (...args) => {
    if (called) return;
    called = true;
    clearTimeout(timer);
    onSuccess.apply(this, args);
  }
}

socket.emit("hello", 1, 2, withTimeout(() => {
  console.log("success!");
}, () => {
  console.log("timeout!");
}, 1000));
```

[Getting an acknowledgment on server send/emit](https://stackoverflow.com/questions/9568467/getting-an-acknowledgment-on-server-send-emit)



我以前有自问自答 [How do I let socket.io server re-emit message to a particular socket when that socket re-connect?](https://stackoverflow.com/questions/62992888/how-do-i-let-socket-io-server-re-emit-message-to-a-particular-socket-when-that-s)



