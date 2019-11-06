#! /bin/bash
env='.env'
if [ -f '.env.local' ]; then
    env='.env.local'
fi
host=`grep "^REDIS_HOST" $env | cut -d '=' -f2`
if [ -z "${host}" ]; then
    host='localhost'
fi
result=`redis-cli -h ${host} ping`
if [ $result = 'PONG' ];
then
    echo "redis server @${host} starts!"
    exit 0
else
    echo "redis server does not start, please start it first"
    exit 1
fi