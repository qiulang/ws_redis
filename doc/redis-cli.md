### 本项目常用到的redis命令

首先目前只用到两个数据结构 string & hash

相关常用命令

1. `SET key value EX time` https://redis.io/commands/set 设置string
2. `HSET myhash field1 value`  https://redis.io/commands/hset  设置hash和field， myhash如果不存在会自动创建
3. `keys pattern`  https://redis.io/commands/keys   查找所有的keys (string, hash) keys命令支持pattern, 但可能带来性能问题，可以用scan，但还没用
4. `exist key1 key2 nosuchkey` https://redis.io/commands/exists 但不支持pattern
5. `hexists hash field` https://redis.io/commands/hexists 判断hash是否存在每个field
6. `del key1 key2 key3 `  https://redis.io/commands/del 不存在就直接忽略，但不支持pattern
7. `hdel myhash field1` https://redis.io/commands/hdel 删除hash表的某个field
8. `hget hash field` https://redis.io/commands/hget 和 hexists 有点类似，如果不存在返回nil
9. `hkeys hash` https://redis.io/commands/hkeys  返回hash中所有的field。但这也是我觉得key这个关键字在redis有点含混，hkeys 返回是field我觉得就应该是 hash表的key， 而hash表本身不应该叫key！
10. pubsub https://redis.io/commands/pubsub 有几组子命令
    1. pubsub channels 当前存在通道



