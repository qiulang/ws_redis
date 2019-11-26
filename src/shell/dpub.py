#! /usr/bin/env python3
import requests
import sys
import argparse
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

parser = argparse.ArgumentParser()
parser.add_argument("-u", "--uid", help="either uid or sid should be provided")
parser.add_argument("-sid", help="either uid or sid should be provided")
parser.add_argument(
    "-s", "--server", help="If server is not provided localhost will be used, 1 means using aliyun server",
    type=int)
args = parser.parse_args()
uid = args.uid
sid = args.sid
server = 'https://docker1.emicloud.com/' if args.server == 1 else "http://localhost:3000/"
# NOT server = args.s or "http://localhost:3000/"
if (not uid and not sid):
    print('Either uid or sid should be provided')
    sys.exit()
if (uid):
    payload = {"uid": uid}
if (sid):
    payload = {"sid": sid}
url = server + 'dpub'
# without using termcolor or colorama
confirm = input(
    'POST \033[93m %s \033[0m to server: \033[93m %s \033[0m (y|n)?' % (payload, url))
if (len(confirm) > 0 and not confirm.startswith(('y', 'Y'))):
    sys.exit()


headers = {'content-type': 'application/json'}

response = requests.post(url, json=payload, headers=headers, verify=False)
print(response.text)
