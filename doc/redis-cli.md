### 本项目常用到的redis命令

#### 常用命令

首先，redis版本必须是 4.0以上，因为我用 hset 设置多个field，而不是用hmset （见下）

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



注: redis不像RMDB一样提供看数据库表信息方法，key-value store 需要使用者自己维护结构信息，这是为什么看到key的值经常用`:`分隔几段。

常用手段看表信息有 `keys` 和 `scan match` 可以先用 `info keyspace`  看目前有多少key



#### 示例

下面以阿里开发环境为例子，演示如何查看redis里记录的websocket相关信息，有三组信息跟websokcet通信相关：

1. websocket:socket_user 记录socket.id 到uid映射，因为连接发生变化时候，需要由socket.id找到对应uid
2. websocket:uid , uid 是 seid_ccgeid_eid形式，找到uid后再去看这个hash内容记录是否正确
3. 查看所有连接通道，每个坐席一个通道，通道名称就是uid

```shell
bash-5.0# redis-cli -h emic-cm-redis.redis.rds.aliyuncs.com -p 6379 -a Sinicnet123456
Warning: Using a password with '-a' or '-u' option on the command line interface may not be safe.
//可以先查看记录多少对连接
emic-cm-redis.redis.rds.aliyuncs.com:6379> hlen websocket:socket_user
(integer) 5 
//非生产环境连接数一般都不多，可以直接打出
emic-cm-redis.redis.rds.aliyuncs.com:6379> hgetall websocket:socket_user
 1) "9rWgG-9V5F-HlbVWAAAD"
 2) "134_243_1000988323"
 3) "3lbtpgSQTR_CB8XBAAAF"
 4) "134_243_1000965676"
 5) "3bfMtpeGITNg2bLcAAAB"
 6) "134_243_1000962235"
 7) "BwaNplVtl2r4E-dAAAAH"
 8) "134_243_1000962325"
 9) "chjwBQNIQvMIHP1AAAAI"
10) "134_243_1000998469"
//或者就像看websocket连接的id
emic-cm-redis.redis.rds.aliyuncs.com:6379> hkeys websocket:socket_user
1) "9rWgG-9V5F-HlbVWAAAD"
2) "3lbtpgSQTR_CB8XBAAAF"
3) "3bfMtpeGITNg2bLcAAAB"
4) "BwaNplVtl2r4E-dAAAAH"
5) "chjwBQNIQvMIHP1AAAAI"
//进一步再参看每个连接信息，每个坐席hash是websocket:uid(uid是seid_ccgeid_eid)
emic-cm-redis.redis.rds.aliyuncs.com:6379> hgetall websocket:134_243_1000962235
1) "socketid"
2) "3bfMtpeGITNg2bLcAAAB"
3) "seid"
4) "134"
5) "ccgeid"
6) "243"
//参看目前redis消息通道
emic-cm-redis.redis.rds.aliyuncs.com:6379> pubsub channels
1) "134_243_1000998469"
2) "socket.io-response#/#"
3) "134_243_1000965676"
4) "134_243_1000962325"
5) "socket.io-request#/#"
6) "seat_message_channel"
7) "134_243_1000988323"
8) "134_243_1000962235"
```

