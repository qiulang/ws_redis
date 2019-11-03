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



###实现socket.io 

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

1. `socket_user ` 哈希表 存 `socket.id` 到 `user_id`映射 ： 客户端成功连接到服务器就发`login`事件（自定义事件），消息内容是 `user_id`, 服务器收到 `login`事件，在redis的`socket_user `表添加一对key:value对 `socket.id`： `user_id`
2. 维护`socket_user `哈希表目的是 当断线时候, 服务器会收到`disconnet`事件（包括网络问题、关闭页面）从 `socket.id` 知道相应`user_id`，更新 `user_id` 哈希表的相关数据
3. 每个坐席登录后为它创建哈希表 key 是 `user_id`, 用它来存所有跟这个坐席相关信息。每个坐席有自己的哈希表。
4. redis的pubsub 目前只用了sub，订阅从web服务器发来消息，为每个坐席建立一个通道。暂时还没有设置额外的公告通道用来和 web 服务器交互。
5. redis的pub目前没用是因为web服务器希望上传消息直接从浏览器调用http接口，而不是通过 websocket服务器pub方式通知web服务器。



注：

1. pubsub 必须要两个redis示例，因为 `(node:80054) UnhandledPromiseRejectionWarning: Error: Connection in subscriber mode, only subscriber commands may be used` 

2. 连别的机器redis最简单办法 在他的redis-cli 运行 `CONFIG SET protected-mode no` 



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

2. [root 和 alias 区分很重要](https://stackoverflow.com/questions/10631933/nginx-static-file-serving-confusion-with-root-alias) 我们必须用alias, 并针对 publicPath的值设置。子路径用 alias不用root 但 "/" **必须是root!!**

3. [location 一些规则](https://www.digitalocean.com/community/tutorials/understanding-nginx-server-and-location-block-selection-algorithms)

4. 可以单独对 socket.io 设置 location，这样就不需要 `@websocket ` 做 fallback。

5. 如果单独对 socket.io 设置location， [SPA就可以用history mode](https://router.vuejs.org/guide/essentials/history-mode.html#example-server-configurations) 用 `index.html` 做 fallback. 

6. [location 做 path match的时候， websocket连不上，暂时无解](https://stackoverflow.com/questions/58668373/socket-io-with-nginx-location-path-match-hit-the-error-during-websocket-handsha)

   

   

