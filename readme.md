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



开始写socket.io + redis pubsub 如果需要可以借鉴下 https://github.com/steffenwt/nodejs-pub-sub-chat-demo