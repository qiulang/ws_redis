#! /usr/bin/env python3
import random
import string
from hashlib import sha256
from datetime import datetime
# from timeit import timeit
import math
from time import time

import requests
import argparse
import urllib3
from termcolor import cprint

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

auth_type = 'signature'
source = 'client.pc.common'  # 'client.bs'
number = '7820'
password = '123456'
switch_number = '02566687671'
seat = f"{number}@{switch_number}"
login_type = 1
url = "https://emicall-cmb.emicloud.com/user/token"

# need pyhton 3.6
# https://stackoverflow.com/questions/2257441/random-string-generation-with-upper-case-letters-and-digits


def get_token(repeat):
    for i in range(repeat):
        nonce = ''.join(random.choices(
            string.ascii_uppercase + string.digits, k=32))
        now = datetime.now()
        timestamp = datetime.timestamp(now)
        ts = str(math.ceil(timestamp))
        sig = (f"auth-type={auth_type}&login_type={login_type}"
               f"&nonce={nonce}&seat={seat}&source={source}&"
               f"timestamp={ts}&signatureKey={password}")
        # print(f"signature before sha256:{sig}")
        signature = sha256(sig.encode()).hexdigest().upper()
        headers = {
            'auth-type': 'signature',
            "signature": signature,
            "seat": seat,
            "nonce": nonce,
            "source": source,
            "timestamp": ts
        }
        cprint(f"round #{i}: nonce:{nonce}", 'green')
        start = time()
        response = requests.post(
            url, json={"login_type": 1}, headers=headers, verify=False)
        end = time()
        cprint(f"round #{i}, takes {end-start:.3f} seconds", 'green')
        result = response.json()
        if (result['code'] == 200):
            token = result['data']['token']
            expire = result['data']['token_expired_at']
            date = datetime.fromtimestamp(expire)
            cprint(
                f"round #{i} result: token:{token}, expire@{date:%Y-%m-%d %H:%M:%S} ", 'yellow')
        else:
            cprint(result['info'], 'red')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument("-r", help="repeat times", type=int)
    args = parser.parse_args()
    repeat = args.r if args.r else 1
    get_token(repeat)
