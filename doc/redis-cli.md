### 本项目常用到的redis命令

首先，redis版本必须是 4.0以上，因为我用 heset 设置多个field，而不是用hmset （见下）

其次，目前只用到两个数据结构 string & hash.

相关常用命令

1. `SET key value EX time` https://redis.io/commands/set 设置string

2. `HSET myhash field1 value`  https://redis.io/commands/hset  设置hash和field， myhash如果不存在会自动创建

3. `HMSET key field value` 用来设置多个field已经在redis 4.0 deprected ， 因为hset就可以做到

4. `info server  ... info stats` https://redis.io/commands/info 看各种配置, 比如查看服务器版本，知道可以支持hset多个设置

5. `keys pattern`  https://redis.io/commands/keys   查找所有的keys (string, hash) keys命令支持pattern, 但可能带来性能问题，可以用scan，但还没用

6. `exist key1 key2 nosuchkey` https://redis.io/commands/exists 但不支持pattern

7. `hexists hash field` https://redis.io/commands/hexists 判断hash是否存在每个field

8. `del key1 key2 key3 `  https://redis.io/commands/del 不存在就直接忽略，但不支持pattern

9. `hdel myhash field1` https://redis.io/commands/hdel 删除hash表的某个field

10. `hget hash field` https://redis.io/commands/hget 和 hexists 有点类似，如果不存在返回nil

11. `hkeys hash` https://redis.io/commands/hkeys  返回hash中所有的field。但这也是我觉得key这个关键字在redis有点含混，hkeys 返回是field我觉得就应该是 hash表的key， 而hash表本身不应该叫key！

12. `hgetall hash` https://redis.io/commands/hgetall 查看 某个hash表的所有值

13. `hlen hash` 看这个hash表有几个键值对，比如 `hlen websocket:socket_user` 查目前有多少websocket连接

14. pubsub https://redis.io/commands/pubsub 有几组子命令

    1. pubsub channels 当前存在通道

    2. publish channel message 返回值显示几个通道收到了

       



