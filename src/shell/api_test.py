#! /usr/bin/env python3
# encoding=utf-8

import argparse

import requests
from termcolor import cprint
from mtk import get_nouce, get_token
import mtk

test_url = "https://emic-cmb.emicloud.com/BSClient/getTransferSeatList"


def api_test(url, input={}, client='b'):
    cprint(f'test {url}, get token first', 'green')
    token = get_token(client=client)
    headers = {
        "source": mtk.sources[client],
        "token": token,
    }
    base_params = {
        "seid": mtk.seid,
        "ccgeid": mtk.ccgeid,
        "uid": mtk.userid,
    }
    if len(input) > 0:
        base_params.update(input)

    response = requests.get(url, headers=headers,
                            params=base_params,
                            verify=False)

    result = response.json()
    if (result['code'] != 200):
        cprint(f"{url} failed ", 'red')
    else:
        return result['data']


def get_transfer_eatList():
    data = api_test(test_url, {"group_per_page": 10,
                               "group_page": 1})
    for group in data:
        gid = group['gid']
        name = group['name']
        seats = group['seats']
        cprint(f"{gid}:{name}:{len(seats)}", "yellow")
        for seat in seats:
            cprint(seat, "green")


get_transfer_eatList()
