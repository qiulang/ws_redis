#! /usr/bin/env python3
import redis
import datetime
import mysql.connector
import argparse


def insert_mysql():
    cnx = mysql.connector.connect(user='emic',
                              password='Emicnet1234!@#$',
                              host='rm-2zes4379t40gt64xoco.mysql.rds.aliyuncs.com',
                              database='emicall_cc_man')
    cursor = cnx.cursor()
    command = ("INSERT INTO quality_inspect_call (task_id,cc_number)"+
               "VALUES (%(task_id)s, %(cc_number)s)")
    for i in range(rows):
        data_line = {
            "task_id":task_id,
            "cc_number":f"{cc}{i}"
        }
        cursor.execute(command, data_line)
    cnx.commit()
    cursor.close()
    cnx.close()

def insert_redis():
    rs = redis.Redis(
    host='r-2ze2ojuacmdgvwevj3pd.redis.rds.aliyuncs.com', password='uSeisaa1bier')
    pipe = rs.pipeline()
    for i in range(rows):
        pipe.lpush(f"tasks:{task_id}",f"{cc}{i}")
    pipe.execute()

def times(func):
    now = datetime.datetime.now()
    print(now)
    func()
    print(datetime.datetime.now()-now)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("-r", "--redis", default="n",
                        help="add to redis or mysql (if no)")
    args = parser.parse_args()
    toredis = (args.redis == "yes" or args.redis == "y")
    if (toredis):
        times(insert_redis)
    else:
        times(insert_mysql)

task_id = 4000
cc = "qq_pc_103_2024_00000002_1645584073_751667"
rows = 100000

if __name__ == '__main__':
    main()
