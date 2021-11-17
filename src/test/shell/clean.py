#! /usr/bin/env python3

import redis
import argparse


def parse(rs, mock):
    pipe = rs.pipeline()
    pipe.hgetall('websocket:socket_user')
    sockets = pipe.execute()[0]
    # pipe = rs
    # sockets = pipe.hgetall('websocket:socket_user')
    users = {}
    for k, v in sockets.items():
        if v in users:
            users[v].add(k)
        else:
            users[v] = {k}
    # end of 1st loop
    for k, v in users.items():
        ws = 'websocket:'+k.decode("utf-8")
        if not rs.exists(ws):
            print(f"NEED to delete {ws} related sid(s):{len(v)}:{v}")
            mock or rs.hdel('websocket:socket_user', *v)
            continue
        sid = rs.hget(ws, 'socketid')
        if not sid in v:
            print(f'We do not have {sid} -> {k}, but {v}')
        else:
            # print(
            #     f'We need to delete all the others {len(v)-1} values for {ws}')
            pass
        v.discard(sid)
        if (len(v) > 0):
            print(f'We need to delete {ws}:{len(v)}:{v}')
            mock or rs.hdel('websocket:socket_user', *v)
    # end of 2nd loop


def supply(rs, mock):
    sukey = "websocket:socket_user"
    pipe = rs.pipeline()
    pipe.keys("websocket:*")
    pipe.hkeys(sukey)
    [users, ss] = pipe.execute()
    ss = set(ss)
    for user in users:
        pipe.hget(user, 'socketid')
    sids = pipe.execute()
    u2 = dict(zip(sids, users))
    for sid in u2.keys():
        if sid == None:  # "websocket:socket_user"
            continue
        if sid in ss:
            continue
        user = u2[sid].decode("utf-8").replace('websocket:', '')
        print(f"why you are not in {user}:{sid}")
        mock or pipe.hset(sukey, sid, user)
    pipe.execute()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-d", "--delete", default="no",
                        help="whether to add/del the useless data in redis， default is no")
    parser.add_argument("-s", "--supplyment", default="no",
                        help="whether to add websocket:user data to websocket:socket_user， default is no")
    args = parser.parse_args()
    mock = args.delete == "no"
    supplyment = args.supplyment != "no"
    rs = redis.Redis(
        host='r-2ze0b3b5fcea8914pd.redis.rds.aliyuncs.com', password='Sinicnet123456')
    if supplyment:
        supply(rs, mock)
    else:
        parse(rs, mock)
