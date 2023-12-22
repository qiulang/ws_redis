#!/usr/bin/expect
set timeout 60
# https://stackoverflow.com/questions/16229643/how-to-expect-multiple-prompts-correctly
set prompt "(%|#|>|\\$ )"
# https://www.iclarified.com/87910/how-to-fix-no-matching-host-key-type-found-on-mac
spawn /opt/local/bin/sshpass -p "Qiulang0405@fjxm" ssh qiulang@192.168.1.16 -p 2222 -oHostKeyAlgorithms=+ssh-rsa
expect -re $prompt
send "p\r"
expect -re $prompt
send "CM\r"
expect -re $prompt
send "12\r"
expect -re $prompt
sleep 1
# https://www.thegeekstuff.com/2011/10/grep-or-and-not-operators/
send "docker ps | grep 'front\\\|fpm' | grep -v pause\r"
expect -re $prompt
interact
