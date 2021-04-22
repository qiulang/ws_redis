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


class api_test:

    source = "server.api"
    init_secret = "api.cm.default.secret.da388235780e6fy5"
    init_keyname = "api_cm_default_secret"

    def __init__(self, backend="https://emicall-cmb.emicloud.com") -> None:
        self.backend = backend
        self.sign_url = backend + "/server/signkey"
        self.super_list_url = backend + "/api/super_enterprise"
        self.ent_list_url = backend + "/api/enterprise"
        self.super_info_url = backend + "/api/super_enterprise/info"
        self.ent_info_url = backend + "/api/enterprise/info"
        self.super_mod_url = backend + "/api/super_enterprise/:seid"
        self.ent_mod_url = backend + "/api/enterprise/:seid/:ccgeid"
        self.keyname, self.secret = self.init_keyname, self.init_secret
        self.request_apikey()

    @staticmethod
    def _get_nouce(length=8):
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

    @staticmethod
    def _get_ts():
        now = datetime.now()
        timestamp = datetime.timestamp(now)
        ts = str(math.ceil(timestamp))
        return ts

    @staticmethod
    def _get_querystr(dic):
        return '&'.join([f'{key}={value}' for key, value in dic.items()])

    @staticmethod
    def _url_update(input_url, url_dict):
        for key in url_dict.keys():
            input_url = input_url.replace(f":{key}", url_dict[key])
        return input_url

    def get_headers(self, extra=None):
        nonce = self._get_nouce()
        ts = self._get_ts()
        headers = {
            'auth-type': 'signature',
            'keyname': self.keyname,
            "nonce": nonce,
            "source": self.source,
            "timestamp": ts
        }
        tmp = headers.copy()
        if extra is not None:
            tmp.update(extra)
        od = OrderedDict(sorted(tmp.items()))
        sig = self._get_querystr(od)
        sig += f"&signatureKey={self.secret}"
        # cprint(f"signature before sha256:{sig}", 'green')
        signature = sha256(sig.encode()).hexdigest().upper()
        # cprint(f"signature after sha256:{signature}", 'green')
        headers.update({"signature": signature})
        return headers

    def request_apikey(self):
        headers = self.get_headers()
        response = requests.post(self.sign_url, headers=headers, verify=False)
        result = response.json()
        if result['code'] != 200:
            cprint(f'result: {result}', 'red')
            raise Exception('获取签名失败，请检查程序代码')
        data = result['data']
        self.keyname, self.secret = data['name'], data['value']

    def get_helper(self, url, params=None):
        headers = self.get_headers(params)
        response = requests.get(url, params=params,
                                headers=headers, verify=False)
        result = response.json()
        # cprint(f'result: {result}', 'green')
        return_code = result['code']
        if return_code != 200:
            cprint(f'请求失败 {url}', 'red')
            return return_code, result['info']
        else:
            cprint(f'请求成功 {url} : 查询参数 {params}', 'yellow')
            return return_code, result['data']

    def put_helper(self, url, data):
        headers = self.get_headers(data)
        response = requests.put(url, headers=headers, data=data)
        result = response.json()
        return_code = result['code']
        if return_code != 200:
            cprint(f"{url} : {data} 修改结果 {result} 失败", 'yellow')
            return False
        cprint(f"{url} : {data} 修改结果 {result} 成功", 'green')
        return True

    def test_call(self):
        test_query = {"key": "view_customer_history", "seid": "134"}
        test_url = self.backend + "/enterprise/super/settings"
        code, data = self.get_helper(test_url, test_query)
        if code != 200:
            return
        key = data[0]['key']
        if test_query['key'] != key:
            cprint(f'返回结果有误 {test_url}', 'red')
        else:
            desc = data[0]['description']
            cprint(f'返回结果正确: {desc}', 'green')

    @staticmethod
    def _verify_ent(code, data, total=1):
        if code != 200:
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

    def super_list(self):
        cprint('先查任意超级企业', 'magenta')
        code, data = self.get_helper(self.super_list_url)
        cprint('目前应该有155家超级企业', 'blue')
        self._verify_ent(code, data, total=155)
        cprint('再查超级企业134', 'magenta')
        test = {'seid': '134'}
        code, data = self.get_helper(self.super_list_url, test)
        self._verify_ent(code, data)

    def ent_list(self):
        cprint('先查任意企业', 'magenta')
        code, data = self.get_helper(self.ent_list_url)
        cprint('目前应该有260家企业', 'blue')
        self._verify_ent(code, data, total=260)
        cprint('再查超级企业134的子企业', 'magenta')
        test = {'seid': '134'}
        code, data = self.get_helper(self.ent_list_url, test)
        cprint('超级企业134目前应该有40家子企业', 'blue')
        self._verify_ent(code, data, total=40)

    def ent_info(self):
        cprint('查超级企业134详情', 'magenta')
        test = {'seid': '134'}
        _, data = self.get_helper(self.super_info_url, test)
        cprint(data, 'green')
        cprint('查超级企业134子企业243详情', 'magenta')
        test = {'seid': '134', 'ccgeid': '243'}
        _, data = self.get_helper(self.ent_info_url, test)
        cprint(data, 'green')

    def super_mod(self):
        test = {'seid': '133'}
        channel = {"1": "易米直签", "2": "联通发展", "3": "电信发展"}
        _, data = self.get_helper(self.super_list_url, test)
        ent = data.pop('data')[0]
        cprint(ent, 'green')
        old_name = ent['name']
        new_name = 'test_' + old_name
        telephone_seat_count = ent['telephone_seat_count']
        super_max_concurrent = ent['super_max_concurrent']
        url = self._url_update(self.super_mod_url, test)
        cprint(f'示例修改超级企业133的名字:{old_name} 改为 {new_name}', 'yellow')
        mod = {'name': new_name, 'contract_ep_name': "sell1",
               "customer_code": "code11",
               "dev_channel": "1",
               "telephone_seat_count": str(int(telephone_seat_count)+1),
               "super_max_concurrent": str(int(super_max_concurrent)+1)}
        result = self.put_helper(url, mod)
        if not result:
            return
        _, data = self.get_helper(self.super_list_url, test)
        ent = data.pop('data')[0]
        cprint(ent, 'green')
        if ent['name'] == new_name:
            cprint('成功修改企业名字', "green")
        else:
            cprint('修改企业名字失败', "red")

    def ent_mod(self):
        ent_test = {'seid': '134', 'ccgeid': '243'}
        eptype = {"1": "正式企业", "2": "测试企业", "3": "演示企业"}
        code, data = self.get_helper(self.ent_info_url, ent_test)
        ep_code = data['ep_code']
        ep_type = data['ep_type']
        max_concurrent = data['max_concurrent']
        enterprise_max_account = data['enterprise_max_account']
        mod = {"ep_code": ep_code+"1", "ep_type": "2",
               "max_concurrent": str(int(max_concurrent)+1),
               "enterprise_max_account": str(int(enterprise_max_account)-1)}
        cprint(f"当前值 ep_code:'{ep_code}' -- ep_type:'{ep_type}'"
               f"-- max_concurrent:'{max_concurrent}'"
               f"-- enterprise_max_account:'{enterprise_max_account}'", 'green')
        cprint(f'修改为 {mod}', "yellow")
        url = self._url_update(self.ent_mod_url, ent_test)
        result = self.put_helper(url, mod)
        if not result:
            return
        _, data = self.get_helper(self.ent_info_url, ent_test)
        cprint(data, 'green')
        ep_code = data['ep_code']
        ep_type = data['ep_type']
        if ep_code == mod['ep_code'] and ep_type == eptype[mod['ep_type']]:
            cprint('成功修改企业信息', "green")
        else:
            cprint('修改企业信息失败', "red")
        cprint('测试输入参数错误情况', "yellow")
        mod = {"ep_code": ep_code+"-1", "ep_type": "3"}
        result = self.put_helper(url, mod)
        if not result:
            cprint('通过输入参数错误测试', 'yellow', attrs=['underline', 'bold'])


def pyver_check():
    min_ver = 3, 6
    if sys.version_info < min_ver:
        cprint('版本太低', 'yellow')
        sys.exit()


def main():
    pyver_check()
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    test = api_test()
    # test.test_call()
    # test.super_list()
    # test.ent_list()
    # test.ent_info()
    # test.super_mod()
    test.ent_mod()


if __name__ == '__main__':
    main()
