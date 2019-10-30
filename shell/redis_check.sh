#! /bin/bash
result=`redis-cli ping`
if [ $result = 'PONG' ];
then
    echo "redis server starts!"
    exit 0
else
    echo "redis server does not start, please start it first"
    exit 1
fi