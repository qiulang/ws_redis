#! /usr/bin/env python3
# encoding=utf-8
import sys
import random
import string
from datetime import datetime
from collections import OrderedDict
import math
from hashlib import sha256
import urllib3

import requests
from termcolor import cprint

sign_url = "https://emicall-cmb.emicloud.com/server/signkey"
test_url = "https://emicall-cmb.emicloud.com/enterprise/super/settings"
super_list_url = "https://emicall-cmb.emicloud.com/api/super_enterprise"
ent_list_url = "https://emicall-cmb.emicloud.com/api/enterprise"
super_info_url = "https://emicall-cmb.emicloud.com/api/super_enterprise/info"
ent_info_url = "https://emicall-cmb.emicloud.com/api/enterprise/info"
super_mod_url = "https://emicall-cmb.emicloud.com/api/super_enterprise/:seid"
ent_mod_url = "https://emicall-cmb.emicloud.com/api/enterprise/:seid/:ccgeid"

test_query = {"key": "view_customer_history", "seid": "134"}
source = "server.api"
init_secret = "api.cm.default.secret.da388235780e6fy5"
init_keyname = "api_cm_default_secret"
name, secret = init_keyname, init_secret


def pyver_check():
    min_ver = 3, 6
    if sys.version_info < min_ver:
        cprint('版本太低', 'yellow')
        sys.exit()


def get_nouce(length=8):
    return ''.join(random.choices(
        string.ascii_uppercase + string.digits, k=length))


def get_ts():
    now = datetime.now()
    timestamp = datetime.timestamp(now)
    ts = str(math.ceil(timestamp))
    return ts


def get_querystr(dic):
    return '&'.join([f'{key}={value}' for key, value in dic.items()])


def url_update(input, dict):
    for key in dict.keys():
        input = input.replace(f":{key}", dict[key])
    return input


def get_headers(extra=None):
    nonce = get_nouce()
    ts = get_ts()
    headers = {
        'auth-type': 'signature',
        'keyname': name,
        "nonce": nonce,
        "source": source,
        "timestamp": ts
    }
    tmp = headers.copy()
    if (extra != None):
        tmp.update(extra)
    od = OrderedDict(sorted(tmp.items()))
    sig = get_querystr(od)
    sig += f"&signatureKey={secret}"
    # cprint(f"signature before sha256:{sig}", 'green')
    signature = sha256(sig.encode()).hexdigest().upper()
    # cprint(f"signature after sha256:{signature}", 'green')
    headers.update({"signature": signature})
    return headers


def get_helper(url, params=None):
    headers = get_headers(params)
    response = requests.get(url, params=params,
                            headers=headers, verify=False)
    result = response.json()
    # cprint(f'result: {result}', 'green')
    return_code = result['code']
    if (return_code != 200):
        cprint(f'请求失败 {url}', 'red')
        return return_code, result['info']
    else:
        cprint(f'请求成功 {url} : 查询参数 {params}', 'yellow')
        return return_code, result['data']


def put_helper(url, data):
    headers = get_headers(data)
    response = requests.put(url, headers=headers, data=data)
    result = response.json()
    cprint(f"{data} 修改 {result}", 'yellow')
    if (result['code'] != 200):
        cprint(f"{data} 修改失败")
        return False
    return True


def get_apikey():
    global name, secret
    name, secret = init_keyname, init_secret
    headers = get_headers()
    response = requests.post(sign_url, headers=headers, verify=False)
    result = response.json()
    # cprint(f'result: {result}', 'green')
    if (result['code'] != 200):
        cprint(f'result: {result}', 'red')
        # sys.exit()
        raise Exception('获取签名失败，请检查程序代码')
    data = result['data']
    return data['name'], data['value']


def test_call():
    code, data = get_helper(test_url, test_query)
    if (code != 200):
        return
    key = data[0]['key']
    if test_query['key'] != key:
        cprint(f'返回结果有误 {test_url}', 'red')
    else:
        desc = data[0]['description']
        cprint(f'返回结果正确: {desc}', 'green')


def verify_ent(code, data, total=1):
    if (code != 200):
        return
    meta = data.pop('meta', {})
    cprint(f"total: {meta['total']}", 'cyan')
    if meta['total'] == total:
        cprint('返回的企业数正确', 'yellow')
    else:
        cprint('返回的企业数不正确', 'red')
    ents = data.pop('data', [])
    cprint('打印其中一组数据', 'cyan')
    for item in ents:
        cprint(item, 'cyan')
        break
    link = data.pop('links', {})
    cprint(f"下一个查询url: {link['next']}", 'cyan')


def super_list():
    cprint('先查任意超级企业', 'magenta')
    code, data = get_helper(super_list_url)
    cprint('目前应该有155家超级企业', 'blue')
    verify_ent(code, data, total=155)
    cprint('再查超级企业134', 'magenta')
    test = {'seid': '134'}
    code, data = get_helper(super_list_url, test)
    verify_ent(code, data)


def ent_list():
    cprint('先查任意企业', 'magenta')
    code, data = get_helper(ent_list_url)
    cprint('目前应该有260家企业', 'blue')
    verify_ent(code, data, total=260)
    cprint('再查超级企业134的子企业', 'magenta')
    test = {'seid': '134'}
    code, data = get_helper(ent_list_url, test)
    cprint('超级企业134目前应该有40家子企业', 'blue')
    verify_ent(code, data, total=40)


def ent_info():
    cprint('查超级企业134详情', 'magenta')
    test = {'seid': '134'}
    code, data = get_helper(super_info_url, test)
    cprint(data, 'green')
    cprint('查超级企业134子企业259详情', 'magenta')
    test = {'seid': '134', 'ccgeid': '243'}
    code, data = get_helper(ent_info_url, test)
    cprint(data, 'green')


def super_mod():
    test = {'seid': '133'}
    _, data = get_helper(super_list_url, test)
    ent = data.pop('data')[0]
    cprint(ent, 'green')
    old_name = ent['name']
    new_name = 'test_' + old_name
    url = url_update(super_mod_url, test)
    cprint(f'示例修改超级企业133的名字:{old_name} 改为 {new_name}', 'yellow')
    data = {'name': new_name}
    result = put_helper(url, data)
    if not result:
        return
    _, data = get_helper(super_list_url, test)
    ent = data.pop('data')[0]
    if ent['name'] == new_name:
        cprint('成功修改企业名字', "green")
    else:
        cprint('修改企业名字失败', "red")


def ent_mod():
    ent_test = {'seid': '134', 'ccgeid': '243'}
    code, data = get_helper(ent_info_url, ent_test)
    ep_code = data['ep_code']
    ep_type = data['ep_type']
    cprint(f"ep_code:'{ep_code}' -- ep_type:'{ep_type}'", 'green')
    url = url_update(ent_mod_url, ent_test)
    data = {"ep_code": ep_code+"1", "ep_type": "1"}
    result = put_helper(url, data)
    if not result:
        return
    _, data = get_helper(ent_info_url, ent_test)
    cprint(data, 'green')


if __name__ == '__main__':
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    pyver_check()
    name, secret = get_apikey()
    # test_call()
    # super_list()
    # ent_list()
    # ent_info()
    # ent_mod()
    super_mod()
