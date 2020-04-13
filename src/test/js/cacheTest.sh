#! /bin/bash
# curl https://emicall-cmb.emicloud.com/logo -H 'source:client.bs' \
#      -H'origin:https://docker1.emicloud.com' 

# echo
# echo "again!"

# curl -i https://emicall-cmb.emicloud.com/logo -H 'source:client.bs' \
#      -H 'origin:https://docker1.emicloud.com' \
#      -H 'If-None-Match:e07145e7ff03233a6d4865e8270b49d5'



curl -i  -H 'source:client.bs' \
     -H 'token:18c3cec862f41f4ab9bc0a5469545970e135a432d234b7b9a8df408663c98700' \
     -H "Accept: application/json" -X POST -d '{"vos_arrears":0}' \
     "https://emicall-cmb.emicloud.com/enterprise/setting/134/243"