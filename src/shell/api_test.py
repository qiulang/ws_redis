#! /usr/bin/env python3
# encoding=utf-8

import argparse

import requests
from termcolor import cprint
from mtk import get_nouce, get_token
import mtk

trans_url = "https://emic-cmb.emicloud.com/BSClient/getTransferSeatList"
ivr_url = "https://emic-cmb.emicloud.com/BSClient/tanferIvrResponse"


def api_test(url, method='get', input={}, client='b'):
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

    if method == 'get':
        response = requests.get(url, headers=headers,
                                params=base_params,
                                verify=False)
    elif method == 'post':
        response = requests.post(url, headers=headers,
                                 data=base_params,
                                 verify=False)

    result = response.json()
    if (result['code'] != 200):
        cprint(f"{url} failed:{result}", "red")
        cprint(
            f"{url} failed: reason:{response.reason}, status:{response.status_code}")
    else:
        return result['data']


def get_transfer_seatList():
    data = api_test(trans_url, {"group_per_page": 10,
                                "group_page": 1})
    for group in data:
        gid = group['gid']
        name = group['name']
        seats = group['seats']
        cprint(f"{gid}:{name}:{len(seats)}", "yellow")
        for seat in seats:
            cprint(seat, "green")


# get_transfer_seatList()

# {"cc_number":"cc_bs_243_7820_00014748_1585652331_141060589",
# "ivrFlowId":7148,"variables":[{"EXCURESULT":0},{"CREDIT_CARD_VERCODE":"06SDdn8JcSkYyYR55mfBIA=="},{"CREDIT_CARD_VALIDITY":"NHsR3RDr3HLSNJ+nPiZkEg=="},{"CREDIT_CARD_NUMBER":"+FLi5WMuj8lm8W0up8Bunw=="},{"DEBIT_CARD_NUMBER":""}],"usrQueryId":95,"response":true}

def ivr_test():
    param = {"cc_number": "cc_bs_243_7820_00014748_1585652331_141060589",
             "usrQueryId": 95,
             "rspCode": 0,
             "virtualKey": 1
             }
    data = api_test(
        ivr_url, 'post', param)
    #{'status': 140000017, 'data': {'state': 1, 'subState': 0}, 'info': '账号不在线'}
    #{'status': 200, 'data': {'state': 4, 'subState': 0, 'ccNumber': 'cc_bs_243_7820_00014748_1585652331_141060589'}, 'info': '操作成功'}
    cprint(data, "cyan")


ivr_test()
