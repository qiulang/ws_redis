#! /usr/bin/env python3
import requests
import sys
import argparse
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

parser = argparse.ArgumentParser()
parser.add_argument("-l", help="level can be d(debug), i(info), w(warn)")
parser.add_argument("-ns", help="namespace to open or close")
parser.add_argument(
    "-s", "--server", help="If server is not provided localhost will be used, 1 means using aliyun server",
    type=int)
args = parser.parse_args()
level = args.l
ns = args.ns
server = 'https://docker1.emicloud.com/' if args.server == 1 else "http://localhost:3000/"
if (not level and not ns):
    payload = {}
if (level):
    payload = {"level": level}
if (ns):
    payload = {"ns": ns}
url = server + 'clog'
# without using termcolor or colorama
confirm = input(
    'PUT \033[93m %s \033[0m to server: \033[93m %s \033[0m (y|n)?' % (payload, url))
if (len(confirm) > 0 and not confirm.startswith(('y', 'Y'))):
    sys.exit()

headers = {'content-type': 'application/json'}
response = requests.put(url, json=payload, headers=headers, verify=False)
print(response.text)

# just a more rbust curl one-liner
# curl --header "Accept: application/json"  http://localhost:3000/rep/elog
# curl -H 'Accept: application/json' -H 'Content-Type: application/json'  -X PUT -d '{"updated_field1":"updated_value1"}' "http://localhost:3000/clog"
