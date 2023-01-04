### redis 知识点梳理



#### 基础篇

1. Redis 是如何执行的？
2. Redis 快速搭建与使用
3. 字符串使用与内部实现原理
4. 字典使用与内部实现原理
5. 列表使用与内部实现原理
6. 集合使用与内部实现原理
7. 有序集合使用与内部实现原理
8. Redis 持久化——RDB
9. Redis 持久化——AOF
10. Redis 持久化——混合持久化
11. Redis 事务深入解析
12. Redis 键值过期操作
13. Redis 过期策略与源码分析



#### 进阶篇

1. Redis 管道技术——Pipeline
2. 查询附近的人——GEO
3. 优秀的基数统计算法——HyperLogLog
4. 游标迭代器(过滤器)——Scan
5. 内存淘汰机制与算法
6. 消息队列——发布订阅模式
7. 消息队列的其他实现方式
8. 消息队列终极解决方案——Stream（上）
9. 消息队列终极解决方案——Stream（下）



#### 实战篇

1. 分布式锁详解与代码实战
2. 布隆过滤器安装与使用及原理分析
3. 实现延迟队列的两种方法—完整案例
4. 定时任务案例实战
5. RediSearch 高性能的全文搜索引擎
6. Redis 性能测试实战
7. Redis 慢查询实战
8. Redis 性能优化实战方案
9. Redis 主从同步实战
10. Redis 哨兵模式实战（上）
11. Redis 哨兵模式实战（下）
12. Redis 集群模式实战（上）
13. Redis 集群模式实战（下）
14. Redis 问题汇总和相关解决方案
15. 技能学习指南
16. 加餐：Redis 的可视化管理工具



#### 高级使用

1. 主从复制、Redis Sentinel (哨兵) 和 Redis Cluster (集群)；
2. 稳定有消息确认 (ACK) 的消息队列 Stream；
3. Redis 实现的延迟队列和定时任务；
4. 亿万级数据查询、以及亿万级数据的秒去重；
5. Redis 慢查询与性能优化；
6. Redis 运行原理以及常用数据类型的内部实现。



Redis 管道技术——Pipeline 我们代码在用[transaction](https://github.com/luin/ioredis#transaction) 已经用到，但是当时没有太深入了解[pipeline到底什么含义](https://redis.io/topics/pipelining)，其实很简单，因为redis的一个tcp 服务器，每条命令执行都是一个请求相应对

#### digital ocean tutorial

[How To Manage a Redis Database](https://www.digitalocean.com/community/tutorial_series/how-to-manage-a-redis-database)

#### scalegrid.io

[Top Redis Use Cases by Core Data Structure Types](https://scalegrid.io/blog/top-redis-use-cases-by-core-data-structure-types/)

[Caching tweets using Node.js, Redis and Socket.io](https://scalegrid.io/blog/caching-tweets-using-node-js-redis-and-socket-io-2/)  

[Using Redis Object Cache to Speed Up Your WordPress Installation](https://scalegrid.io/blog/using-redis-object-cache-to-speed-up-your-wordpress-installation/)

[Get To Know the Redis Database: Iterating Over Keys](https://scalegrid.io/blog/redis-iterating-over-keys/)

[Get all hashes exists in redis](https://stackoverflow.com/questions/41136755/get-all-hashes-exists-in-redis)



#### redis in action

https://redislabs.com/ebook/part-2-core-concepts/ 

To restore redis data just move redis backup file (dump.rdb) into your redis directory and start the server.



#### Use Cases by Core Data Structure Types

https://scalegrid.io/blog/top-redis-use-cases-by-core-data-structure-types/

[A Simple Redis Use Case for Sorted Sets](https://www.paperplanes.de/2010/11/29/a_simple_redis_use_case.html)



#### SO 高评分问答

1. [How to use redis PUBLISH/SUBSCRIBE with nodejs to notify clients when data values change?](https://stackoverflow.com/questions/4441798/how-to-use-redis-publish-subscribe-with-nodejs-to-notify-clients-when-data-value) 这几本就是我们的实现，在readme里也提到SO 另外三个 Socket.io + redis pubsub 的文档，以及 https://tech.trello.com/the-trello-tech-stack/

2. [Redis: possible to expire an element in an array or sorted set?](https://stackoverflow.com/questions/7577923/redis-possible-to-expire-an-element-in-an-array-or-sorted-set) “What if I want to add values to a List type structure and have them get auto removed 1 hour after insertion”  有一个不错回答  “There is a common pattern that solves this problem quite well. Use sorted sets, and use a timestamp as the score. It's then trivial to delete items by score range, which could be done periodically, or only on every write, with reads always ignoring the out of range elements, by reading only a range of scores.”

3. [Redis cache vs using memory directly](https://stackoverflow.com/questions/19477821/redis-cache-vs-using-memory-directly) 都知道了，但也值得记录一下

4. [When to use a key/value store such as Redis instead/along side of a SQL database?](https://stackoverflow.com/questions/7535184/when-to-use-a-key-value-store-such-as-redis-instead-along-side-of-a-sql-database) 没细看，属于入门介绍

5. [Print number of keys in Redis](https://stackoverflow.com/questions/9888387/print-number-of-keys-in-redis) 其中一个答案我们也用上了 `eval "return #redis.call('keys', 'prefix-*')" 0` 看总数用`info keyspace` 和更简单的`dbsize`

6. [What's the Point of Multiple Redis Databases?](https://stackoverflow.com/questions/16221563/whats-the-point-of-multiple-redis-databases) redis多库问题 和 [Is Redis just a cache?](https://stackoverflow.com/questions/10137857/is-redis-just-a-cache) redis 几个使用场景，这两个问题碰了很多次

7. [Redis key naming conventions? ](https://stackoverflow.com/questions/6965451/redis-key-naming-conventions) 除了: 还可以 “*use dots for multi-words fields*”  或者 “a hash (#) for id-parts of keys”

8. [Redis strings vs Redis hashes to represent JSON: efficiency?](https://stackoverflow.com/questions/16375188/redis-strings-vs-redis-hashes-to-represent-json-efficiency) 

9. [node.js store objects in redis](https://stackoverflow.com/questions/8694871/node-js-store-objects-in-redis) 和上面一个问题相关 redis 的value必须是string,所以就`JSON.stringyfy`

10. [Redis Pubsub and Message Queueing](https://stackoverflow.com/questions/27745842/redis-pubsub-and-message-queueing) pub比sub快怎么办，我们的readme也调研过，pubsub不存信息，但这个问答提到有些buffer

11. [Redis Vs RabbitMQ as a data broker/messaging system in between Logstash and elasticsearch](https://stackoverflow.com/questions/29539443/redis-vs-rabbitmq-as-a-data-broker-messaging-system-in-between-logstash-and-elas) 和 [Redis Pub/Sub with Reliability](https://stackoverflow.com/questions/6192177/redis-pub-sub-with-reliability) 和 [Celery: When should you choose Redis as a message broker over RabbitMQ?](https://stackoverflow.com/questions/43264838/celery-when-should-you-choose-redis-as-a-message-broker-over-rabbitmq) 关于pub-sub的实现，这样对比我们碰到过几次，最后一个文档给了建议什么时候用redis什么时候用RabbitMQ

12. [Difference between Document-based and Key/Value-based databases?](https://stackoverflow.com/questions/3554169/difference-between-document-based-and-key-value-based-databases) 和 [node.js database](https://stackoverflow.com/questions/2750673/node-js-database) 暂时对我们没什么用

13. [Time of creation of key in redis](https://stackoverflow.com/questions/9917331/time-of-creation-of-key-in-redis) 我们代码已经用上

14. [SCAN vs KEYS performance in Redis](https://stackoverflow.com/questions/32603964/scan-vs-keys-performance-in-redis) key阻塞单线程执行，这个已经知道。

15. [Scaling Socket.IO to multiple Node.js processes using cluster](https://stackoverflow.com/questions/18310635/scaling-socket-io-to-multiple-node-js-processes-using-cluster) 必须用redis adapter 这在10年前是个问题



pub-sub 、redis 应用场景、message broker的比较和实现、key-value的存储方式
