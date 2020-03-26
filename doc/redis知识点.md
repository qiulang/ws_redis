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