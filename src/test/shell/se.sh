#! /bin/bash
siege  -r 1  -c 10 http://localhost:10080/elog
sleep 0.1
echo "wait for 0.1 sec to test again"
siege  -r 1  -c 10 http://localhost:10080/elog