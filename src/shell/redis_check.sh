#! /bin/bash
host=`printenv | grep REDIS_HOST | cut -d '=' -f2`
if [ -z "${host}" ]; then
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
fi
port=`printenv | grep REDIS_PORT | cut -d '=' -f2`
if [ -z "${port}" ]; then
    port=`grep "^REDIS_PORT" .env | cut -d '=' -f2`
    if [ -f '.env.local' ]; then
        port2=`grep "^REDIS_PORT" .env.local | cut -d '=' -f2`
    fi
    if [ ! -z "${port2}" ]; then
        port=${port2}
    fi
    if [ -z "${port}" ]; then
        port='6379'
    fi
fi
result=`redis-cli -h ${host} -p ${port} ping`
echo "redis-cli -h ${host} -p ${port} ping: ${result}"
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