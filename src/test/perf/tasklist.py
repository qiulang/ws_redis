#! /usr/bin/env python3
import redis
import datetime
import mysql.connector
import argparse

#https://dev.mysql.com/doc/connector-python/en/connector-python-example-cursor-transaction.html
def compose_data():
    for i in range(int(rows/1000)):
        d = []
        for j in range(1000):
            # data_line = {
            #     "task_id":task_id,
            #     "cc_number":f"{cc}{i}"
            # }
            # cursor.execute(command, (task_id,f"{cc}{i}"))
            d.append((task_id,f"{cc}{i*1000+j}"))

            # CREATE PROCEDURE inspect_proc(IN task bigint,IN number varchar(63))
            # INSERT INTO quality_inspect_call(task_id,cc_number) values (task, number)
            # cursor.callproc("inspect_proc", (task_id,f"{cc}{i}"))
        # cursor.executemany(command,data)
        data.append(d)

def insert_mysql():
    # command = ("INSERT INTO quality_inspect_call (task_id,cc_number)"
    #            "VALUES (%(task_id)s, %(cc_number)s)")

    times(compose_data)
    now = datetime.datetime.now()
    print("insert executemany")
    cursor = cnx.cursor(buffered=True)
    command = ("INSERT INTO quality_inspect_call (task_id,cc_number)"
               "VALUES (%s, %s)")
    for i in range(int(rows/1000)):
        cursor.executemany(command,data[i])
    cnx.commit()
    cursor.close()
    print(datetime.datetime.now()-now)

def insert_nom():
    print("insert normally")
    cursor = cnx.cursor()
    command = ("INSERT INTO quality_inspect_call (task_id,cc_number)"
               "VALUES (%s, %s)")
    for i in range(rows):
        cursor.execute(command, (task_id,f"{cc}{i}"))
    cnx.commit()
    cursor.close()

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
    parser.add_argument("-m", "--many", default="n",
                        help="executemany or not")
    args = parser.parse_args()
    toredis = (args.many == "yes" or args.many == "y")
    if (toredis):
        times(insert_mysql)
    else:
        times(insert_nom)
    cnx.close()

task_id = 4004
cc = "qq_pc_103_2024_00000002_1645584073_751667"
rows = 10000
data = []
cnx = mysql.connector.connect(user='emic',
                        password='Emicnet1234!@#$',
                        host='rm-2zes4379t40gt64xoco.mysql.rds.aliyuncs.com',
                        database='emicall_cc_man')

if __name__ == '__main__':
    main()
