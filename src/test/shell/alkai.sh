#!/usr/bin/expect
set timeout 30
# https://github.com/jumpserver/jumpserver/issues/4189
# https://github.com/jumpserver/jumpserver/issues/4775
set prompt "(%|#|>|\\$ )"
spawn /opt/local/bin/sshpass -p "Qiulang0405@bj" ssh qiulang@192.168.1.16 -p 2222
expect -re $prompt
send "p\r"
expect -re $prompt
send "kaifa\r"
expect -re $prompt
send "5\r"
expect -re $prompt
sleep 1
# https://www.thegeekstuff.com/2011/10/grep-or-and-not-operators/
send "docker ps | grep 'front\\\|fpm' | grep -v pause\r"
expect -re $prompt
interact
