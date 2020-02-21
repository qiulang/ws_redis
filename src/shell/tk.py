#! /usr/bin/env python3
# encoding=utf-8
import random
import string
from hashlib import sha256
from datetime import datetime
# from timeit import timeit
import math
from time import time, sleep
from multiprocessing import Process
import argparse
import urllib3

import requests
from termcolor import cprint

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

token_url = "https://emicall-cmb.emicloud.com/user/token"
bstoken_url = "https://emicall-cmb.emicloud.com/user/bsToken"
ent_url = "https://emicall-cmb.emicloud.com/enterprise/super"
auth_type = 'signature'
sources = {"p": "client.pc.common", "w": "client.web",
           "b": "client.bs"}
token_urls = {"p": token_url, "b": bstoken_url, "w": token_url}
number = '7820'
password = '123456'
pwdsha = sha256(password.encode()).hexdigest()
switch_number = '02566687671'
seat = f"{number}@{switch_number}"
username = "qiulang@cc.emicloud.com"
login_type = 1

# need pyhton 3.6
# https://stackoverflow.com/questions/2257441/random-string-generation-with-upper-case-letters-and-digits


def get_nouce(length=32):
    return ''.join(random.choices(
        string.ascii_uppercase + string.digits, k=length))


def del_token(token, source):
    headers = {
        'auth-type': 'token',
        "source": source,
        "token": token,
        "nonce": get_nouce()
    }
    response = requests.delete(token_url, headers=headers, verify=False)
    result = response.json()
    if (result['code'] != 200):
        cprint(f"delete token failed:{result['code']}:{result['info']}", 'red')
    else:
        cprint(f"delete token succeeded")

# 为了能在parallel_run统一调用，图省事，get_ent 和 get_token接收一样的参数


def get_token(i=0, client="p", **kwargs):
    nonce = get_nouce()
    now = datetime.now()
    timestamp = datetime.timestamp(now)
    ts = str(math.ceil(timestamp))
    source = sources[client]
    url = token_urls[client]
    if (client == "p" or client == "b"):
        sig = (f"auth-type={auth_type}&login_type={login_type}&"
               f"nonce={nonce}&seat={seat}&source={source}&"
               f"timestamp={ts}&signatureKey={password}")
        headers = {"seat": seat}
        if (client == "b"):
            headers.update({"domain": 'docker1.emicloud.com'})
    else:
        tmp = sha256(pwdsha.encode()).hexdigest()
        sig = (f"auth-type={auth_type}&login_type={login_type}&"
               f"nonce={nonce}&source={source}&timestamp={ts}&"
               f"username={username}&signatureKey={tmp}")
        headers = {"username": username}
    # print(f"signature before sha256:{sig}")
    signature = sha256(sig.encode()).hexdigest().upper()
    headers.update({
        'auth-type': 'signature',
        "signature": signature,
        "nonce": nonce,
        "source": source,
        "timestamp": ts
    })
    cprint(f"round #{i}: Call {url} ", 'green')
    start = time()
    response = requests.post(
        url, json={"login_type": 1}, headers=headers, verify=False)
    end = time()
    cprint(f"round #{i}, takes {end-start:.3f} seconds", 'green')
    result = response.json()
    if (result['code'] != 200):
        cprint(
            f"round #{i} Call {url} failed {result['code']}:{result['info']}", 'red')
        return
    token = result['data']['token']
    expire = result['data']['token_expired_at']
    date = datetime.fromtimestamp(expire)
    cprint(
        f"round #{i}: token:{token}, expire@{date:%Y-%m-%d %H:%M:%S} ", 'green')
    if ("token" in kwargs):
        return token
    cprint(f"let us delete the token:{token} after 1 second", "green")
    # sleep(1.0)
    del_token(token, source)


def get_ent(token, i=0, client="w"):
    cprint(f"round #{i} Call /enterprise/super using {token}", "yellow")
    headers = {
        "source": 'client.web',
        "token": token,
        "nonce": get_nouce()
    }
    start = time()
    response = requests.get(
        ent_url, headers=headers,
        params={"per_page": 50},
        verify=False)
    end = time()
    result = response.json()
    if (result['code'] == 200):
        ent = result['data']['data']
        cprint(
            f"round #{i} get {len(ent)} enterprises data,takes {end-start:.3f} seconds", 'yellow')
    else:
        cprint(
            f"round #{i} /enterprise/super failed token:{token}, {result['info']}", 'red')


dispatch = {"p": get_token, "w": get_ent, "b": get_token}


def serial_run(repeat, client="p"):
    cprint(f"Start {sources[client]} test serially:", "cyan")
    start = time()
    for i in range(repeat):
        dispatch[client](i, client)
    end = time()
    cprint(f'Done {end-start:.3f} seconds', "cyan")


def parallel_run(repeat, client="p", **kwargs):
    cprint(f"Start {sources[client]} test in parallel:", "cyan")
    if (client == "w"):
        token = kwargs['token']
    else:
        token = ""
    cprint(f"Using token:{token}", "cyan")
    start = time()
    proc = []
    for i in range(repeat):
        # p = Process(target=dispatch[client], args=(i, client, token))
        p = Process(target=dispatch[client], kwargs={
                    "i": i, "client": client, "token": token})
        p.start()
        proc.append(p)
    for p in proc:
        p.join()
    end = time()
    cprint(f'Done {end-start:.3f} seconds', "cyan")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-r", help="repeat times", type=int)
    parser.add_argument(
        "-m", "--mode", help="run the test serially or parallel")
    parser.add_argument("-c", help="pc client, web client or BS client")
    args = parser.parse_args()
    # 我的机器300次并发,程序就出错了，200次可以
    repeat = args.r if args.r else 1
    mode = args.mode if args.mode else 's'
    client = args.c if args.c else 'p'
    # PC接口只测试token，web接口测试两个接口。
    # 所以web接口的并发代码要复杂些，要取到一次token后再并发接口请求
    if (client != 'w'):
        if (mode == "s"):
            serial_run(repeat=repeat, client=client)
        else:
            parallel_run(repeat, client)
    else:
        # web接口不要再测试并发token了，因为PC已经测试过
        if (mode == "s"):
            cprint("图省事没有开发web接口的串行测试方法，就用1轮并行测试来替代吧", "yellow")
        else:
            token = get_token(0, client="w")
            parallel_run(repeat, client="w", token=token)
