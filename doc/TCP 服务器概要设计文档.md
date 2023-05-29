# TCP 服务器/客户端概要设计

## TCP 服务器/客户端实现

TCP 服务器/客户端用和FCS消息交互， 它基于[nodejs 提供系统库 Net](https://nodejs.org/api/net.html) 来实现TCP服务，解析xml 数据包采用开源 [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) ，并借鉴目前的websocket 服务器设计，它和CM后端交互同样通过 **redis pubsub** 来实现 。

CM后端可以只订购一个redis**公关通道**用来接收所有TCP客户端消息，然后通过代码逻辑区分不同客户端消息；也可以为每个TCP客户端订购一个通道，通过它单独接收TCP服务器发来的该客户端消息， 但仍然需要订购一个公共通道用来接收初始消息。 同理， TCP 服务器也可以只订购一个redis公关通道用来接收所有CM后端发来消息，通过代码逻辑区分不同客户端消息；也可以为每个TCP客户端订购单独一个通道接收CM后端发来的该客户端消息。

根据目前需求文档，每家酒店都要部署一套我们系统，那实际还不存在不同客户共用TCP 服务和redis pubsub 服务的情况，所以目前先采用TCP服务器和CM服务器**都只订购一个**redis公关通道方式来实现消息交互。这是和websocket服务器设计不同地方，websocket服务器为每个坐席都单独订购一个通道。

TCP 服务器相当于中间人作用，把FCS发来消息转发给Web服务器，它自己不直接把接收消息存入MySQL数据库。

### TCP 服务和 FCS 交互的协议分析

它和FCS 通信根据FCS 接口文档，交互的协议有以下几个实现要求：

1. In usual cases, **FCS Unicorn would be the client** while the external system would be the host, however, Unicorn also can be configured as the tcp server if required. 所以FCS通常作为TCP的客户端，我们作为TCP服务器，但我们同时也会实现TCP client 

2. Each message exchanged between FCS Unicorn and external system will need to be encapsulated as  **STX** (ASCII 2)  + MESSAGE BODY + **ETX** (ASCII 3) .  The MESSAGE BODY is of XML message, the root element defines the record type. 所以每个和 FCS 交互的消息都是 XML 字符串，并用 STX 和 ETX 作为头尾字符。当收到 tcp 包数据需要检查 STX/ETX 对，判断方法有很多：比如可以先判断缓存数据里是否已经有 STX, 如果有就需要在收到 tcp 包数据查找ETX; 如果没有需要先查找STX再查找ETX，如果缓存和收到数据包**都没有STX**，我们可以简单认为是无效数据回复NAK，或者再引入更复杂的处理算法，这在以后文档更新中补充。如果已有STX但是没有ETX可把收到数据包继续缓存，连续几个包都没有ETX（极端情况）要如何处理会再以后文档更新中补充。

3. All messages received by both parties need to be replied with an ACK (ASCII 6) or NAK (ASCII 21). If an ACK is not received within a defined timeout period, the sender will retransmit the message again. This continues until a maximum retry has been reached. The message will be discarded after that and **the next message in the queue will be sent.** 每发送一个消息都要等接受方发来ack ，如果在规定的超时时间内没收到ack 就要重发该消息直到收到ack或者达到最大重试次数。主要协议里说 the next message in the queue will be sent，这就意味着消息是**串行处理**，一条消息处理完（成功收到ack或者达到最大重试次数）才会再处理下一条消息；也意味着一个TCP数据包不可能含两个XML消息；但一个XML消息可能在一个TCP包或跨数个TCP。

4. **NAK** indicates that the external system had received a message, which it does not understand. Upon receiving NAK, FCS Unicorn will **retransmit the last message** till the maximum retry had been reached.  如果收到消息没法解析成事先约定好的XML消息类型，需要回复NAK，如果收到NAK需要重发刚才那条消息直到收到ack或者达到最大重试次数。NAK消息应该是为了容错和以后的扩展，比如因为消息丢包，接收方没法正确解析XML消息，回复NAK，发送方就重发该消息；如果能解析XML消息，但是不是事先约定好的消息类型（就是文档说的不能 **understand**的消息），那回复NAK在目前意义可能不大，因为重发的消息可能还是不能understand. 但对于NAK消息需要有统计，以便以后分析它发生的原因。

5. Data resent after timeout expired if sender do not receive any replies from the receiver. Data will be drop after exceed numbers of retries. 发送消息后需要等待相应，如果**等待响应超时**就重发消息直到收到相应或者达到重发上限。注：极端情况是重发数次后收到NACK （或者NACK重发后没有响应），如果重发次数少于重发上限值，根据NACK处理接着重发直到重发上限值，也就是重发次数对超时和NACK统一计数（做简单处理），不针对他们中任何一种情况单独计数。

   

注1：在TCP 层面没法标记数据的开始和结束，需要在应用层面来做。常见办法有在应用层标记数据包长度，比如http/websocket 采用此方法；或者用特殊字符来比较开始结束，FCS采用这种方法。

#### FCS 定义的 ACK/NACK/无响应 交互图

```mermaid
sequenceDiagram
Note left of sender: 正常情况
sender->>receiver: 发送数据包
receiver->>receiver:成功解析 STX+XML+ETX 数据流
receiver->>+sender: ACK (ASCII 6)
sender->>-receiver: 发送下一条数据
Note left of sender: 异常情况一：不理解接收到消息
sender->>receiver: 发送数据包
receiver->>receiver: 无法解析 STX+XML+ETX 数据流 或者 解析出的XML不在定义范围
receiver->>+sender: NACK (ASCII 21)
sender->>receiver: 重发直到超过重试上限或者收到ACK
sender->>-receiver: 发送下一条
Note left of sender: 异常情况二：没有收到ACK或者NACK
sender->>receiver: 发送数据包
activate sender
sender->>sender: 超时没有收到回应
sender->>receiver: 重发直到超过重试上限或者收到ACK
sender->>receiver: 发送下一条
deactivate sender
```



### FCS和我们系统的交互过程

FCS作为TCP客户端通过以下流程实现和我们系统的交互。

TCP服务器和web服务器的交互过程借鉴原来websocket 服务器的实现，通过 redis的 pubsub 和 CM Web 服务器交互。当TCP服务器和web服务器需要向对方发送消息，先把消息`pub` 到redis 服务器事先`sub`的公关通道，然后接收方在`sub`响应事件里处理收到的消息：

```mermaid
sequenceDiagram
TCP 客户端->>+TCP 服务器: 发送XML消息
TCP 服务器->>TCP 服务器:解析成功
TCP 服务器->>-Redis 服务器: 向公共通道发送(pub)
Note over TCP 服务器, Web 服务器: TCP server和Web server 都订购(sub) 公共通道
Redis 服务器->>Web 服务器:发送给Web server
Note right of Web 服务器: 因为sub公共通道
TCP 客户端 -->> Web 服务器: TCP客户端发送XML消息到Web服务器过程
Web 服务器 ->> Redis 服务器: 向公共通道发送(pub)
Redis 服务器->>TCP 服务器: 发送给TCP server
Note right of TCP 服务器: 因为sub公共通道
TCP 服务器->>TCP 客户端: 发送XML消息
Web 服务器 -->> TCP 客户端 : Web服务器发送XML消息到TCP客户端过程
```



根据下面对消息类型的分析，有几个消息是包含请求和响应对；对于数据同步请求还需要一对开始和结束消息对来包裹需要同步数据，对应数据同步的流程需要再细化。



### 消息定义

FCS 定义的消息格式有**不严谨**的地方，解析XML需要注意。比如**除了**我们发往FCS的查询 job状态消息 `JobEnquiry`消息和它的相应 `JobEnquiry Respond`，其他**所有**消息都含有**消息唯一ID** `GUID`和消息发送时间 `SysDaTi` ，保活消息`STAY ALIVE` 只有 `GUID`和`SysDati`

GUID 没有明确定义消息格式，但从示例看应该是 **UUID**格式，36个字符，32个字符+ 4个`-`分隔符： [8个字符-4个字符-4个字符-4个字符-12个字符] ，消息发送时间格式除了 **JobEnquiry**，其他都定义为 `yyyy/mm/dd hh:mm:ss`

除了保活消息`STAY ALIVE`   **其他所有消息都带** `PId` Property ID 但它格式不明确。但是 FCS 又定义 `ErrorMessage` 必须含 `GUID`和`SysDaTi`，但`PId`不是必填。

`JobEnquiry` 示例如下， 唯一没有 `GUID` 的消息，时间格式和别的消息不同：

```
<JobEnquiry><SysDaTi>13-Nov-2009 15:00:00</SysDaTi><Sender>PBX1</Sender><PId>1</PId><JobID>123</JobID></JobEnquiry>
```

保活消息示例如下，唯一没有 PId的消息

```
<StayAlive >><SysDaTi>2012/8/4 08:11:07</SysDaTi><GUID>E1A35954-41CC-40f7-BDF1- A7B2CE1EE5B6</GUID></StayAlive >
```

#### 由我们系统发往FCS消息目前定义如下

```
ROOM STATUS
MINI BAR CHARGES/ITEMIZED
CALL CHARGES
POINT OF SALES CHARGES
INTERNET CHARGES
VOD/IPTV CHARGES
VOICE MESSAGE STATUS UPDATE
AUTO WAKEUP CALL SET/CANCEL
AUTO WAKEUP CALL RESPONSE 
REQUEST DATABASE SYNCHRONIZATION // DBSwap
EXPRESS CHECKOUT REQUEST
FOLIO REQUEST
TEXT MESSAGE REQUEST
CREATE JOB
UPDATE JOB
SEND ADHOC MESSAGE //SendAdHocMsg
STAY ALIVE
JobEnquiry
```

除了数据库同步请求 `DBSwap` 和 临时消息 `SendAdHocMsg`只带PId ，其他消息都必须带**房间号和分机号**  `Ex ` 和 `Rm` 

##### 数据库同步消息和临时消息

数据库同步消息示例： `Request Database Synchronization`  The external system will transmit this message when there is a need to synchronize information between the PMS and external system. 数据库同步消息使用详见下面数据库同步相应的描述。

```
<DBSwap><PId>1</PId><Flag>RQ</Flag><SysDaTi>2012/12/15 07:00:17</SysDaTi><GUID>E1A35954- 41CC-40f7-BDF1-A7B2CE1EE5B6</GUID></ DBSwap >
```

`Send Adhoc Message`  临时消息示例：`Rm`不是必备消息，而且没有分机号`Ex`

```
<SendAdHocMsg ><UserName>fcs</UserName><Password>pwd</Password><PId>1</PId><MesgConte nt>This is urgent </MesgContent><DeviceType>MBL</DeviceType><DeviceNo>0122101234</DeviceNo> <MesgType>NM</MesgType><SysDaTi>2012/8/4 08:11:07</SysDaTi><GUID>E1A35954-41CC-40f7- BDF1-A7B2CE1EE5B6</GUID></SendAdHocMsg>
```



##### job 消息

创建Job对  **房间号和分机号**  `Ex ` 和 `Rm` 有单独要求：

1. Either Ex or Rm must exist
2. Either Rm or LocationCode is required

更新Job消息对 **房间号和分机号**  `Ex ` 和 `Rm` 也有单独要求：

1. Either Ex or Rm must exist
2. Either Rm or JobId or JobNo is required. If set to Room, then system will update all the jobs

但给的示例有矛盾地方，根据第二条有 JobId 可以没有 Rm，但是没有Rm 按第一条就必须有Ex,但是示例没有

```
<UpdateJob>><JobAction>Ack</JobAction><UserName>fcs</UserName><Password>pwd</Password>< PId>1</PId><ItemCode>10100</ItemCode><JobId>123</JobId><SysDaTi>2012/8/4 08:11:07</SysDaTi><GUID>E1A35954-41CC-40f7-BDF1-A7B2CE1EE5B6</GUID></UpdateJob >
```

综合这两个例子，分机号Ex可以不存在而不引入问题。对于job相应消息，FCS还额外定义 `ModifyJob` 的响应，但不清楚对应是哪条消息，因为`UpdateJob`也专门定义响应消息。



#### 由FCS发送我们系统消息目前定义如下

```
CHECK-IN/CHECK-OUT
MESSAGE WAITING
DO NOT DISTURB
AUTO WAKEUP CALL SET/CANCEL ROOM CHANGE
ROOM INFORMATION CHANGE
DID ASSIGN/UNASSIGNED
CHANGE CLASS OF SERVICE
EXPRESS CHECK OUT RESPONSE
FOLIO DETAIL & BALANCE RESPONSE
TEXT MESSAGE
DATABASE SYNCHRONIZATION 
NIGHT AUDIT
CREATE JOB RESPONSE
UPDATE JOB RESPONSE
MODIFY JOB
SEND ADHOC MESSAGE RESPONSE 
STAY ALIVE
ERROR MESSAGE
```

##### 两组ST和ED标识的响应对

数据库同步响应的使用，先用 ST标识数据同步开始，之后是一系列 check in / check out数据包，而且这些包的需要设置`<DBSwap>Yes</DBSwap>` 同步结束后再发送 ED标识同步结束。 A Database Swap Start indicator record will be sent first, followed by series of check in / check out packets with the `<DBSwap>Yes</DBSwap>`. At the end, a Database Swap End record will be sent to the external system

示例如下：

```
<DBSwap><PId>1</PId><Flag>ST</Flag><SysDaTi>2012/12/15 07:00:17</SysDaTi><GUID>E1A35954- 41CC-40f7-BDF1-A7B2CE1EE5B6</GUID></ DBSwap > //同步开发
<DBSwap><PId>1</PId><Flag>ED</Flag><SysDaTi>2012/12/15 07:00:20</SysDaTi><GUID>E1A35954- 41CC-40f7-BDF1-A7B2CE1EE5B6</GUID></ DBSwap > //同步结束
```

夜间审计消息`Night Audit` 是另一对含 开始ST和结束ED的消息，而且不含 **房间号和分机号**  `Ex ` 和 `Rm` 

```
< NightAudit ><PId>1</PId><Flag>ST</Flag><SysDaTi>2012/12/15 07:00:17</SysDaTi><GUID>E1A35954-41CC-40f7-BDF1-A7B2CE1EE5B6</GUID></ NightAudit >
< NightAudit ><PId>1</PId><Flag>ED</Flag><SysDaTi>2012/12/15 07:00:20</SysDaTi><GUID>E1A35954-41CC-40f7-BDF1-A7B2CE1EE5B6</GUID></ NightAudit >
```

但夜间审计具体内容，即在开始ST和结束ED的消息对之间的消息是什么没有示例。

除了这两个消息对 `DBSwap`和`NightAudit` 还有临时消息 `SendAdHocMsg`的响应消息，其他消息都含**房间号和分机号**  `Ex ` 和 `Rm` 

#####  UpdateJob vs ModifyJob

但是job的`update`和`modify`响应定义不清晰：

FCS will transmit `UpdateJob` message back to the sender upon its `<UpdateJob>` request packet, 示例如下

```
<UpdateJob ><PId>1</PId><Rm>1001</Rm><AnsSts>OK</AnsSts><Flag>RP</Flag><JobNo>100100</Jo bNo><SysDaTi>2012/08/04 08:19:00</SysDaTi><GUID>B2C35054-4BCC-A0B9-BDF1- AB02CE1EE47B8</GUID></UpdateJob>
```

`ModifyJob` will send upon received any modify job from host 但文档没有记录 ModifyJob请求消息

```
<ModifyJob><Rm>100</Rm><Ex>8100</Ex><PId>1</PId><JobNo>21001</JobNo><JobDetail>Check in welcome drinks</JobDetail><EscLevel>0</EscLevel><ItemCode>100011</ItemCode><ItemName>Welcome Drink</ItemName><AssignedTo>ABC</AssignedTo>< Deadline>2012/8/4 08:30:00</Deadline><GuestName >Mr.Dolp</GuestName><LocationName>Room</LocationName><Job Status>Pending</JobStatus><ACKStatus>1</ACKStatus><Sender>GSS2</Sender><SysDaTi>2012/8/4 08:11:07</SysDaTi><GUID>E1A35954-41CC-40f7-BDF1-A7B2CE1EE5B6</GUID></ModifyJob>
```



##### Error Message

This message will contain the error message as a result of invalid message being received

ErrorMessage给的两个示例，一个容易理解，`IPTVCharge`少了必填字段 字段`Chg` movie charges

```
<ErrorMessage><AnsSts>MI</AnsSts><Desc>Missing ‘Chg’ element in ‘IPTVCharge’ packet</Desc><SysDaTi>2012/8/4 08:11:07</SysDaTi><GUID>E1A35954-41CC-40f7-BDF1- A7B2CE1EE5B6</GUID></ErrorMessage >
```

但下一个示例对应情况不明确

```
<ErrorMessage><PId>01</PId><AnsSts>NF</AnsSts><Desc>Feature not supported</Desc><SysDaTi>2012/8/4 08:11:07</SysDaTi><GUID>E1A35954-41CC-40f7-BDF1- A7B2CE1EE5B6</GUID></ErrorMessage >
```

NF 标识 Feature not enabled or checkout process not running 但这是对哪些消息响应不明确。

根据Error Message示例，我们在XML解析时候，解析失败我们回应NACK，但是收到 ErrorMessage 要如何回应还需要再细化。



## 部署方案

目前考虑TCP服务器和 WebSocket服务器部署在同一个docker容器里，因为考虑TCP服务器对性能的要求不会太高，而且连同一个Redis服务器，配置一样。但也可以和WebSocket服务器分开部署，暂时没有特别考量。



## 工作量分解

1. TCP消息包解析处理。
   1. 接收消息处理正确 STX/ETX对，解析他们包含的XML包，回复ACK/NACK
   2. 发送消息处理 ACK/NACK，以及无响应重发
2. XML 消息解析处理，对于缺少required节点处理，未知节点处理
3. 对于FCS定义请求相应对的处理，特别是数据同步请求响应`<DBSwap>`和 Job请求响应对，需要多个XML消息的处理。

概要设计会进一步补充，尤其是对请求响应处理。

### 测试方案

用两种方法来模拟TCP客户端测试：

1. 对于单个数据包可以通过简单脚本或者netcat模拟tcp客户端来发送
2. 对于多个XML消息的请求响应对，比如 数据同步请求和响应，需要开发脚本来实现
