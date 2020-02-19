#! /usr/bin/env python3
import random
import string
from hashlib import sha256
from datetime import datetime
import math
import urllib3

import requests

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# need pyhton 3.6
# https://stackoverflow.com/questions/2257441/random-string-generation-with-upper-case-letters-and-digits

auth_type = 'signature'
nonce = ''.join(random.choices(string.ascii_uppercase + string.digits, k=32))
now = datetime.now()
timestamp = datetime.timestamp(now)
ts = str(math.ceil(timestamp))
source = 'client.pc.common'  # 'client.bs'
number = '7820'
password = '123456'
switch_number = '02566687671'
seat = f"{number}@{switch_number}"
login_type = 1
str = f"auth-type={auth_type}&login_type={login_type}\
    &nonce={nonce}&seat={seat}&source={source}&timestamp={ts}&signatureKey={password}"
signature = sha256(str.encode()).hexdigest().upper()
headers = {
    'auth-type': 'signature',
    "signature": signature,
    "seat": seat,
    "nonce": nonce,
    "timestamp": ts
}
url = "https://emicall-cmb.emicloud.com/user/token"
response = requests.post(
    url, json={"login_type": 1}, headers=headers, verify=False)
print(response.json())
