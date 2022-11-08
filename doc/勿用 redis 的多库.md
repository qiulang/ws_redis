# 勿用 redis 的多库 ？

[文章出处](http://tangxinfa.github.io/article/52ff7528-redis-7684591a5e93.html)

## 不要将 redis 和 mysql 混为一谈

在接触 redis 之前，相信很多人都有 mysql 的使用经验。

mysql 的实体分层由上至下依次是：

- 实例（instance）

  mysqld 进程。

- 库（database）

- 表（table）

- 记录（row）

- 字段（field）

redis 的实体分层由上至下依次是：

- 实例（instance）

  redis 进程。

- 库（database）

- 键值（Key-Value）

我们很容易将 mysql 与 redis 的实例（instance）和库（database）等同起来，然而却大错特错。

其实

- redis 的实例（instance） 等同于 mysql 的库（database）

- redis 的库（database） 等同于 mysql 的表（table） **不认可**

## redis 的多库是鸡肋

redis 是无预定义结构的（schema-less）数据库，表（table ）的存在意义不大，它更多地是做为命名空间（name space），由于使用的是很不友好的数字命名（默认 0-15）， redis 中的 库（database）形同鸡肋。

以下为 redis 作者的观点，引用自 [database names? - Google 网上论坛](https://groups.google.com/d/msg/redis-db/vS5wX8X4Cjg/8ounBXitG4sJ)

> I understand how this can be useful, but unfortunately I consider Redis multiple database errors my worst decision in Redis design at all… without any kind of real gain, it makes the internals a lot more complex. The reality is that databases don't scale well for a number of reason, like active expire of keys and VM. If the DB selection can be performed with a string I can see this feature being used as a scalable O(1) dictionary layer, that instead it is not.
>
> With DB numbers, with a default of a few DBs, we are communication better what this feature is and how can be used I think. I hope that at some point we can drop the multiple DBs support at all, but I think it is probably too late as there is a number of people relying on this feature for their work.

## 使用 redis 多库是妥协的结果

有一种观点认为不同的应用（app）使用不同的库（database）可以从而避免键命名冲突。

redis 对于不同的库（database）没有提供任何隔离机制，完全依赖于应用（app）部署时约定使用不同的库（database）。

为什么不约定应用（app）使用的所有键都加上应用（app）前缀，或者每个应用（app）使用不同的 redis 实例（instance）呢？

从开发人员的角度来说

- 如果每个应用（app）使用不同的实例（instance），是最省事的，连接 redis 后，直接操作即可

- 如果每个应用（app）使用不同的库（database），略微麻烦一点，连接 redis 后，先执行一下 `select` `db` ，redis 客户端库会提供支持

- 如果每个应用（app）的键（key）都加上应用（app）前缀，会很麻烦，每一处访问 redis 的代码都要涉及

从运维人员的角度来说

- 如果每个应用（app）使用不同的实例（instance），是最麻烦的，维护压力剧增，每个实例（instance）背后还要有配套的启动、停止脚本，监控，主备实例等

- 如果每个应用（app）使用不同的库（database），略微麻烦一点，分配并记录一下，告知开发人员使用指定的 redis 实例及库（database）

- 如果每个应用（app）的键（key）都加上应用（app）前缀，是最省事的，可以灵活地为应用（app）安排使用实例（instance）或库（database）

不同的应用（app）使用不同的库（database）这一方案被采用，很可能是开发人员与运维人员互相妥协的结果。

## redis 的多库扩容难

redis 的数据量或者请求数过高，会导致 redis 不稳定，最终影响服务质量。

这时候就要考虑 redis 扩容了，需要将其中一个库（database）迁到新的实例（instance）上，过程如下：

- 停掉应用（app）

- 将应用（app）的 redis 库（database）同步到新的 redis 实例（instance）上

  通过拷贝 `dump.rdb` 的方式同步（传输）数据，redis 实例（instance）上的所有库（database）数据都是混在一起的，其它应用（app）数据会增加数据同步（传输）时间及新 redis 实例（instance） 数据载入时间。

  如果通过工具在线将应用（app）的 redis 库（database）拷贝到运行中的新 redis 实例（instance）上，会很耗时，对本身负载就很高的 redis 添加更多压力，可能会影响其它应用（app）。

  新 redis 实例（instance）设置为旧 redis 实例（instance） 的 slave，同步完成后取消 Master-Slave 关系，这种方法相对更好一些。

- 启动新的 redis 实例

- 修改应用（app）配置指向新的 redis 实例

- 启动应用（app）

- 清除两个 redis 实例中的脏数据

  `select` `db` ，然后执行 `flushdb` 命令即可，这可能是使用多库最大的好处。

应用（app）的停机时间（Down Time）肯定短不了。

如果每个应用（app）使用不同的实例，需要将某个实例迁到新机器，则可以做到平滑扩容（迁移），过程如下：

- 应用（app）使用 redis sentinel 方式访问 redis

- 新机器部署 redis 新实例

- 新实例设置为旧 redis 实例的 slave

- 同步完成后进行 Master-Slave 换位

- 应用（app）会自动切到新的 redis 实例

- 旧的 redis 实例可以停掉

## 参考

- [What's the Point of Multiple Redis Databases? - Stack Overflow](https://stackoverflow.com/questions/16221563/whats-the-point-of-multiple-redis-databases)

- [database names? - Google 网上论坛](https://groups.google.com/d/msg/redis-db/vS5wX8X4Cjg/8ounBXitG4sJ)

- [Partitioning: how to split data among multiple Redis instances. – Redis](http://redis.io/topics/partitioning)

- [Redis Presharding](http://oldblog.antirez.com/post/redis-presharding.html)



## 讨论

https://stackoverflow.com/questions/16221563/whats-the-point-of-multiple-redis-databases 讨论中提到好处基本都集中在管理，云端部署简单。