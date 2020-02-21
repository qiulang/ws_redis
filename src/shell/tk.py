#! /usr/bin/env python3
# encoding=utf-8
import random
import string
from hashlib import sha256
from datetime import datetime
# from timeit import timeit
import math
from time import time
from multiprocessing import Process
import argparse
import urllib3

import requests
from termcolor import cprint

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

auth_type = 'signature'
sources = {"p": "client.pc.common", "w": "client.web"}  # 'client.bs'
number = '7820'
password = '123456'
pwdsha = sha256(password.encode()).hexdigest()
switch_number = '02566687671'
seat = f"{number}@{switch_number}"
username = "qiulang@cc.emicloud.com"
login_type = 1
token_url = "https://emicall-cmb.emicloud.com/user/token"
ent_url = "https://emicall-cmb.emicloud.com/enterprise/super"

# need pyhton 3.6
# https://stackoverflow.com/questions/2257441/random-string-generation-with-upper-case-letters-and-digits


def get_nouce(length=32):
    return ''.join(random.choices(
        string.ascii_uppercase + string.digits, k=length))


def get_token(i, client="p"):
    nonce = get_nouce()
    now = datetime.now()
    timestamp = datetime.timestamp(now)
    ts = str(math.ceil(timestamp))
    source = sources[client]
    if (client == "p"):
        sig = (f"auth-type={auth_type}&login_type={login_type}&"
               f"nonce={nonce}&seat={seat}&source={source}&"
               f"timestamp={ts}&signatureKey={password}")
        headers = {"seat": seat}
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
    cprint(f"round #{i}: Call /user/token ", 'green')
    start = time()
    response = requests.post(
        token_url, json={"login_type": 1}, headers=headers, verify=False)
    end = time()
    cprint(f"round #{i}, takes {end-start:.3f} seconds", 'green')
    result = response.json()
    if (result['code'] != 200):
        cprint(f"round #{i} /user/token failed {result['info']}", 'red')
        return
    token = result['data']['token']
    expire = result['data']['token_expired_at']
    date = datetime.fromtimestamp(expire)
    cprint(
        f"round #{i}: token:{token}, expire@{date:%Y-%m-%d %H:%M:%S} ", 'green')
    if (client == "p"):
        return
    get_ent(i, token)


def get_ent(i, token):
    cprint(f"round #{i} Call /enterprise/super {token}", "yellow")
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


def serial_run(repeat, client="p"):
    cprint(f"Start {sources[client]} test serially:", "cyan")
    start = time()
    for i in range(repeat):
        get_token(i, client)
    end = time()
    cprint(f'Done {end-start:.3f} seconds', "cyan")


def parallel_run(repeat, client="p"):
    cprint(f"Start {sources[client]} test in parallel:", "cyan")
    start = time()
    proc = []
    for i in range(repeat):
        p = Process(target=get_token, args=(i, client))
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
        "-m", "--mode", help="run the test serially or paraellel")
    parser.add_argument("-c", help="pc client or web client")
    args = parser.parse_args()
    # 我的机器300次并发,程序就出错了，200次可以
    repeat = args.r if args.r else 1
    mode = args.mode if args.mode else 's'
    client = "w" if args.c else 'p'
    if (mode == "s"):
        serial_run(repeat, client)
    else:
        parallel_run(repeat, client)
