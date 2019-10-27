### 写 redis的 pubsub例子

redis nodejs 客户端我们用ioredis,  https://github.com/NodeRedis/node_redis 上一次更新半年前，这里提到[pub/sub问题](https://cnodejs.org/topic/56835f18b9de25e81e01c211) 我们又恰好要用[pubsub](https://github.com/luin/ioredis#pubsub)

它也是用debug记录消息

[pubsub 消息是不存的](https://stackoverflow.com/questions/18079951/does-redis-pub-sub-persist-historical-messages-in-a-channel)

> The pub/sub messages are not queued, and even less persisted.
>
> They are only buffered in the socket buffers, and immediately sent to the subscribers in the same event loop iteration as the publication.
>
> If a subscriber fails to read a message, this message is lost for the subscriber.