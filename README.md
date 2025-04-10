# iceLink 冰点链接 - 简单，快速地通过PCL2主页了解你的服务器

***该项目为PCL2的主页预设***
#### 预览图（管理端）
![管理端预览图](https://github.com/user-attachments/assets/cf517195-3626-4ea0-ae7d-dd87e18ac9c3)



#### 预览图（客户端）
![客户端预览图](https://github.com/user-attachments/assets/eebc4d40-95b6-440e-ac65-ef601f3dae4b)



------

### 环境需求
+ node.js >= v15.14.0

### 部署
1. 下载 js 文件
2. 运行 node app.js 生成默认配置文件
3. 修改 config.json 内的配置 （***“注意：下方未提起的配置项请不要随意修改”***）
```
const ip = "xxxxx";      修改为你面板的地址
const apikey ="xxxxx";   修改为你的apikey
（获取apikey的方法https://docs.mcsmanager.com/zh_cn/apis/get_apikey.html）

const setToken = "";     设置管理员令牌（用于区分客户端和服务端）

const debug = false     调试开关：true-显示调试信息，false-不显示任何信息

const serverConfig = {
    serverName: "",  // 服务器名称(可留空，留空时显示服务器地址)
    serverIP: "",    // 服务器地址(可留空，留空时不显示mc服务器状态)
    serverPORT: ""   // 服务器端口(可留空，默认为25565)
}
```
4. 运行
```
node app.js
如果需要指定端口运行则
set PORT=xxxx node app.js （xxxx为你要指定的端口）
```

5. 使用
目前拥有的命令：
```
notice [公告]     用于设置公告,留空则是关闭公告

exit    不用我多说吧，当然是退出啦
```

#### 如何区分管理端和客户端：
在主页链接后加上admin参数
比如：
```
http://xxx.xxxx.xxx     客户端

http://xxx.xxxx.xxx/?admin=[你设置的管理员令牌]     管理端
```

----
**快捷加入服务器启动的是当前选择的版本** ***（本来是想做成启动对应版本的，但是没法通配指定版本。比如你想玩1.21.1的生电服你肯定是要启动带有辅助mod的版本，而我没办法帮你选择带有辅助模组的版本，只能帮你启动1.21.1原版。所以这个功能被我砍掉了，但是服务器信息卡片上会显示服务器版本）***


### 鸣谢
YuShanNan
https://github.com/YuShanNan/ChiLing-HomePage-PCL2


### 声明
该项目的mc服务器状态API使用的是 ***https://api.mcsrvstat.us/*** 如果出现主页响应缓慢可能是 api 的锅 qwq


该项目使用 CC BY-NC-SA 4.0 协议


项目作者 icelly_QAQ
