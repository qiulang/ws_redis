#! /usr/bin/env python3

import redis
from yachalk import chalk
import argparse


def parse(rs, mock):
    pipe = rs.pipeline()
    pipe.hgetall('websocket:socket_user')
    sockets = pipe.execute()[0]
    # pipe = rs
    # sockets = pipe.hgetall('websocket:socket_user')
    users = {}
    for k, v in sockets.items():
        user = v.decode("utf-8")
        if len(user.split("@")) ==1:
            print(f"{chalk.red('Wrong format')} {user}")
        user = user.split("@")[0]
        if user in users:
            users[user].add(k)
        else:
            users[user] = {k}
    # end of 1st loop
    todel = 0
    for k, v in users.items():
        ws = 'websocket:'+k
        if not rs.exists(ws):
            print(f"{chalk.yellow('NEED to delete')} {ws} related sid(s): {chalk.magenta(len(v))}: {v}")
            mock or rs.hdel('websocket:socket_user', *v)
            todel +=len(v)
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
            print(f"{chalk.cyan('We need to delete')} {ws}: {chalk.cyan(len(v))}: {v}")
            mock or rs.hdel('websocket:socket_user', *v)
            todel +=len(v)
    print(f"{chalk.green(todel)} to be deleted totally")
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
    for sid,u in u2.items():
        if sid == None:  # "websocket:socket_user"
            continue
        if sid in ss:
            continue
        user = u.decode("utf-8").replace('websocket:', '')
        loginTime = rs.hget(u,'loginTime')
        if loginTime == None:
            print(f"No loginTime for {user}")
            loginTime = "Unknown"
        else:
            loginTime = loginTime.decode("utf-8")
        tmp = user + "@" + loginTime
        print(f"why you are not in {chalk.green(user)}: {sid} : {tmp}")
        mock or pipe.hset(sukey, sid, tmp)
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
    # rshost = 'r-2ze2ojuacmdgvwevj3pd.redis.rds.aliyuncs.com'
    # rspass = 'uSeisaa1bier'
    rshost = 'r-2ze0b3b5fcea8914pd.redis.rds.aliyuncs.com'
    rspass = 'Sinicnet123456'
    rs = redis.Redis(
        host=rshost, password=rspass)
    if supplyment:
        supply(rs, mock)
    else:
        parse(rs, mock)
