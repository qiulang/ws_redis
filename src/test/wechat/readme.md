### 模拟微信小程序脚本说明

```  mermaid
 flowchart TD
   1[通过总机号和分机号获取微信登录token] -- /wechat/user/wechatToken -->1.1
   1.1[获取token还有seid,ccgied,uid] -- /wechat/BSClient/seatLogin -->2
   1.1 -- socket.io --> 21[通过token和uid建立websocket连接]
   2[通过总机号和分机号/工号登录 -- 服务器记录登录日志并打开接收CR消息的开关] -->a
   a{微信端判断是否首次登录} -->|是|b[需要获取手机验证码]
   b -- wechat/seat/sendSms --> b1[接收验证码,验证码有效期内可重复使用验证码]
   b1 -- wechat/seat/bindPhone --> c[验证码+手机号绑定手机到小程序]
   a -->|否|d[目前绑定手机号没有有效期]
   c -->3[checkIn前还需要获取坐席所在技能组]
   d -->3
   3 -- wechat/seat/seatInfo --> 3.1[获取技能组信息]
   3.1 -- wechat/seat/checkIn --> 4[checkIn成功显示在线状态,注以下两个调用不是必须在checkIn才可以]
   21 -- checkIn成功后 --> 22[接收CR发来的坐席状态推送]
   4-->|checkIn成功后|22
   4 -- wechat/preview_task/seat/seid/ccgeid/uid --> 4.1
   4.1[获取坐席任务列表,必须在checkIn才可以调用,不然返回空列表] -->5[返回任务列表数据处理]
   4 -- wechat/seat/state --> 4.2[获取坐席可选状态,get请求有token就可以]
   4 -- wechat/customer-result/scheme --> 4.3[获取话后处理可选项,get请求有token就可以]
   5 -- wechat/preview_task/lockCustomer -->5.1[锁定任务未分配客户数>0的任务]
   5.1 --> 5.2[处理锁定任务返回数据,获取ptcid,cid,enc_number]
   5.1 -- 锁定成功后 --> 22
   5.2 -- wechat/preview_task/bombScreenTask/seid/ccgeid/taskid/ptcid -->6
   6[获取弹屏任务,注cid和enc_number都是必填参数,不然返回数据的cusomter字段为空] --> 6.1
   6.1[弹屏任务返回数据整理,获取batch_id,numberID,即 customer.customer_tels.id] 
   6.1 -- wechat/BSClient/callout -->7
   7[弹屏呼叫] --> 8[话后处理]
   7 -- 通话状态 -->22
```

