#! /usr/bin/env python3
# encoding=utf-8
import random
import string
from datetime import datetime
import math
from hashlib import sha256
from time import time, sleep
import argparse
import urllib3

import requests
from termcolor import cprint

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

token_url = "https://emicall-cmb.emicloud.com/user/token"
bstoken_url = "https://emicall-cmb.emicloud.com/user/bsToken"
auth_type = 'signature'
sources = {"p": "client.pc.common", "w": "client.web",
           "b": "client.bs"}
token_urls = {"p": token_url, "b": bstoken_url, "w": token_url}


number = '7820'
password = 'welcome123'
userid = '1000988323'  # 7820
seid = '134'
ccgeid = '243'
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
    # disable SSL Certificate verification
    response = requests.delete(token_url, headers=headers, verify=False)
    result = response.json()
    if (result['code'] != 200):
        cprint(
            f"delete {token} failed:{result['code']}:{result['info']}", 'red')
    else:
        cprint(f"delete {token} succeeded")


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
    # print(f"signature after sha256:{signature}")
    headers.update({
        'auth-type': 'signature',
        "signature": signature,
        "nonce": nonce,
        "source": source,
        "timestamp": ts
    })
    if 'benchmark' in kwargs:  # 就不打印每次调用时间
        response = requests.post(
            url, json={"login_type": 1}, headers=headers, verify=False)
    else:
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
    # 目前只有pc 客户端串行测试才会再测试删除
    if 'del_token' in kwargs:
        cprint(f"let us delete the token:{token} after 0.5 second", "green")
        sleep(0.5)
        start = time()
        del_token(token, source)
        end = time()
        cprint(f"Takes {end-start:.3f} seconds", 'green')
    else:
        return token


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-c", help="pc client, web client or BS client", default="w")
    args = parser.parse_args()
    client = args.c
    if (client != "w" and client != "b" and client != "p"):
        client = "w"
    get_token(client=client)
