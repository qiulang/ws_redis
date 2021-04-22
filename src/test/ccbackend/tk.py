#! /usr/bin/env python3
# encoding=utf-8

import string
from timeit import timeit
from time import time, sleep
from multiprocessing import Process
import argparse

import requests
from termcolor import cprint
from mtk import get_nouce, del_token, get_token

ent_url = "https://emicall-cmb.emicloud.com/enterprise/super"
sources = {"p": "client.pc.common", "w": "client.web",
           "b": "client.bs"}


# 为了能在parallel_run统一调用，图省事，get_ent 和 get_token接收一样的参数

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
        # 如果是 pc client就再测试删除，如果是 bs client就返回token
        if client == "p":
            dispatch[client](i, client, del_token=1)
        else:
            dispatch[client](i, client)
    end = time()
    cprint(f'Done {end-start:.3f} seconds', "cyan")


def parallel_run(repeat, client="p", **kwargs):
    cprint(f"Start {sources[client]} test in parallel:", "cyan")
    if ("token" in kwargs):
        # using the token to other test in parallel
        token = kwargs['token']
    else:
        token = ""
    cprint(f"Using token:{token}", "cyan")
    args = {"client": client, "token": token}
    if ("benchmark" in kwargs):
        args.update({"benchmark": True})
    start = time()
    proc = []
    for i in range(repeat):
        # p = Process(target=dispatch[client], args=(i, client, token))
        args.update({"i": i})
        p = Process(target=dispatch[client], kwargs=args)
        p.start()
        proc.append(p)
    for p in proc:
        p.join()
    end = time()
    cprint(f'Done {end-start:.3f} seconds', "magenta")


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    # 我的机器300次并发,程序就出错了，200次可以
    parser.add_argument("-r", help="repeat times", type=int, default=1)
    parser.add_argument(
        "-m", help="run the test serially or parallel", default="s")
    parser.add_argument(
        "-c", help="pc client, web client or BS client", default="p")
    parser.add_argument(
        "-b", help="performance benchmark, i.e. run test n times", type=int)
    args = parser.parse_args()
    repeat = args.r
    mode = args.m
    client = args.c

    if args.b:
        # using timeit to test token
        if (mode == "p"):
            TEST_CODE = ''' 
parallel_run(repeat,client,benchmark=True)'''  # otherwise IndentationError: unexpected indent
            time = timeit(stmt=TEST_CODE,
                          number=args.b,
                          globals=globals())
        else:
            time = timeit(stmt=get_token,
                          number=args.b,
                          globals=globals())
        cprint(
            f"Run test {args.b} times, take:{time} totally,"
            f"average:{time/args.b:.3f}", "magenta")
        exit(0)

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
