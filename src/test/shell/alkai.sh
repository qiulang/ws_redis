#!/usr/bin/expect
set timeout 30
# https://github.com/jumpserver/jumpserver/issues/4189
# https://github.com/jumpserver/jumpserver/issues/4775
set prompt "(%|#|>|\\$ )"
spawn /opt/local/bin/sshpass -p "Qiulang76@bj" ssh qiulang@root@60.205.207.101@192.168.1.16 -p 2222
expect -re $prompt
send "3\r"
sleep 1
send "docker ps | grep 'front\\\|fpm' | grep -v pause\r"
expect -re $prompt
interact
