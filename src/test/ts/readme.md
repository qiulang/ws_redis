## 测试脚本流程

`npm test` 流程

[Flowchart or Sequence diagram to describe a process?](https://stackoverflow.com/questions/71658379/flowchart-or-sequence-diagram-to-describe-a-process)

注：老版本`gitlab` 的`mermaid` 库 不能解析 `flowchart` 关键字，所以改成 `graph TD`

```mermaid
graph TD
start-->A0
A0[create 3 redis clients & one sub test-result channel]-->A1
A1["start ws test with socketStart()"] -->B1
B1[start 1st ws test, nodejs as client] -->B2
B2["setTimeout() 2s" for ws timer, check if ws connected]-->B3
B3[login message is rejected, invalid token] --> B4
B4[mark ws connected] -->B5
B5[close ws connect] -->B6
B6[close timers & pub test-result] -->A1
A1-->C1
C1[start 2nd ws test, client.bs as client] -->C2
C2[local server skips token check, return login result] -->C3
C3[check redis record for login result] -->C4
C4[redis pub test message, loopback using ws] -->C5
C5["setTimeout() 0.5s" for ps timer, < ws timer] -->C6
C6[ps timeout check if the message is received] -->C7
C7[socket doesn't disconnect] -->B6
A1-->D1
D1[start 3rd ws test, client.wechat as client] -->D2
D1-->D3[server notify 2nd ws to disconnect]
D2[skips token check, return login result] -->D4
D4[redis pub & loopback using ws] -->D5
D5[Check if the pub message is received] -->D6
D6[close timers & pub test-result] --> D7
D7[close all redis clients] --> D8
D8[check logoff test result] --> O[end]
```

`socketConnectBug.ts` 的原因

[Global variables in asynchronous code (socket.io) show an error in an unexpected way](https://stackoverflow.com/questions/71852823/global-variables-in-asynchronous-code-socket-io-show-an-error-in-an-unexpected)

