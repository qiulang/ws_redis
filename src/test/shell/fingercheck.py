#! /usr/bin/env python3
import redis

rs = redis.Redis(
    host='r-2ze2ojuacmdgvwevj3pd.redis.rds.aliyuncs.com', password='uSeisaa1bier')

l = rs.keys('websocket:*')
no, has = 0, 0
for i in l:
    f = rs.hget(i, 'browserFinger')
    if f == None:
        if i != 'websocket:socket_user':
            rs.delete(i)
            print(f'delete obsolete item {i}')
        continue
    if len(f) == 0:
        print(i)
        no += 1
    else:
        print(f'{i} has finger {f}')
        has += 1
print(f'{no} kyes do not have browserFinger, {has} kyes have browserFinger')
