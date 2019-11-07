#! /bin/bash
host=`grep "^REDIS_HOST" .env | cut -d '=' -f2`
if [ -f '.env.local' ]; then
    host2=`grep "^REDIS_HOST" .env.local | cut -d '=' -f2`
fi
if [ ! -z "${host2}" ]; then
    host=${host2}
fi
if [ -z "${host}" ]; then
    host='localhost'
fi
result=`redis-cli -h ${host} ping`
if [ "${result}" = 'PONG' ];
then
    echo "redis server @${host} starts!"
    exit 0
else
# https://stackoverflow.com/questions/669452/is-double-square-brackets-preferable-over-single-square-brackets-in-ba
    if [[ "${result}" =~ "Authentication" ]]; then
        echo "redis server @${host} starts, BUT need password!"
        exit 0
    else
        echo "redis server does not start, please start it first"
        exit 1
    fi
fi