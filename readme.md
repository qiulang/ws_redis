### 写 redis的 pubsub例子

redis nodejs 客户端我们用ioredis,  https://github.com/NodeRedis/node_redis 上一次更新半年前，这里提到[pub/sub问题](https://cnodejs.org/topic/56835f18b9de25e81e01c211) 我们又恰好要用[pubsub](https://github.com/luin/ioredis#pubsub)

它也是用debug记录消息

[pubsub 消息是不存的](https://stackoverflow.com/questions/18079951/does-redis-pub-sub-persist-historical-messages-in-a-channel)

> The pub/sub messages are not queued, and even less persisted.
>
> They are only buffered in the socket buffers, and immediately sent to the subscribers in the same event loop iteration as the publication.
>
> If a subscriber fails to read a message, this message is lost for the subscriber.



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



#### 目前socket.io 的设计

**redis 数据**

1. `socket_user ` 哈希表 存 `socket.id` 到 `user_id`映射 ： 客户端成功连接到服务器就发`login`事件（自定义事件），消息内容是 `user_id`, 服务器收到 `login`事件，在redis的`socket_user `表添加一对key:value对 `socket.id`： `user_id`

2. 维护`socket_user `哈希表目的是 当断线时候, 服务器会收到disconnet事件（包括网络问题、关闭页面）从 `socket.id` 知道相应`user_id`，更新 `user_id` 哈希表的相关数据

3. 每个用户登录后为它创建哈希表 key 是 `user_id`, 用它来存所有跟这个用户相关信息。每个用户有自己的哈希表。

4. 下一步加入pubsub，为每个坐席建立一个通道，而外有一个公告通道用来和 web 服务器交互

   

**socket.io 事件**

1. socket.io系统事件要处理
2. 我们自定义事件如果需要请求相应对, 命名规则就是相应消息+'Ack'，比如 `login` 和`loginAck`

   





