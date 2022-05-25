#!/usr/bin/expect
set timeout 60
# https://stackoverflow.com/questions/16229643/how-to-expect-multiple-prompts-correctly
set prompt "(%|#|>|\\$ )"
spawn /opt/local/bin/sshpass -p "Qiulang76@bj" ssh qiulang@192.168.1.16 -p 2222
expect -re $prompt
send "p\r"
expect -re $prompt
send "CM\r"
expect -re $prompt
send "5\r"
expect -re $prompt
sleep 1
# https://www.thegeekstuff.com/2011/10/grep-or-and-not-operators/
send "docker ps | grep 'front\\\|fpm' | grep -v pause\r"
expect -re $prompt
interact
