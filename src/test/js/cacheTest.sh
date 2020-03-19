#! /bin/bash
curl https://emicall-cmb.emicloud.com/logo -H 'source:client.bs' \
     -H'origin:https://docker1.emicloud.com' 

echo
echo "again!"

curl -i https://emicall-cmb.emicloud.com/logo -H 'source:client.bs' \
     -H 'origin:https://docker1.emicloud.com' \
     -H 'If-None-Match:e07145e7ff03233a6d4865e8270b49d5'

