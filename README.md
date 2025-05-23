# iceLink 冰点链接 - 简单，快速地通过PCL2主页了解你的服务器

***该项目为PCL2的主页***
### 项目简介
iceLink 冰点链接是为PCL2启动器设计的服务器信息面板系统，可快速展示Minecraft服务器状态信息。让玩家进入游戏前知道服务器是否有玩家，让服主和管理了解到服务器的状态！
#### 预览图（管理端）
![管理端预览图](https://github.com/user-attachments/assets/d8025d5d-f5d9-4952-a333-500161a90c86)





#### 预览图（客户端）
![客户端预览图](https://github.com/user-attachments/assets/2cab5e6f-6ea3-4027-8d5e-1f8e4a678d9a)






------
#### 更新日志


v1.8 版本！


- 添加了显示多个服务信息的功能
- 修改了配置文件格式（注意查看，或者删除配置文件重新生成）


**更新计划**


- 显示所有节点
- 添加服务器启停状态
------

### 环境需求
- **Node.js** ≥ v15.14.0  
  [官方下载地址](https://nodejs.org/)  
  安装后可通过以下命令验证版本：
  ```
  node -v
  npm -v
  ```

### 部署
1. 在 [releases](https://github.com/icelly-QAQ/PCL2-HomePage_iceLink/releases/) 中下载最新的 app.js 文件
2. 在 app.js 同目录下的终端运行```node app.js```生成默认配置文件
3. 修改 config.json 内的配置 （***“注意：下方未提起的配置项请不要随意修改”***）
**当需要添加更多服务器时复制 serverConfig_1 条目的所有内容到 serverConfig_1 的下方并把 1 改为 2**
```
{
  "ip": "面板地址",
  "apikey": "您的API密钥",
  "setToken": "管理员令牌",
  "debug": false,
  "servers":{
    "serverConfig_1": {
      "serverName": "服务器名称",
      "serverIP": "服务器地址",
      "serverPORT": "服务器端口"
    },
        "serverConfig_2": {
      "serverName": "服务器名称",
      "serverIP": "服务器地址",
      "serverPORT": "服务器端口"
    }
  }
}
```

| 配置项 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `ip` | string | 是 | 面板地址（无需协议头） | `panel.example.com` |
| `apikey` | string | 是 | MCSManager API Key | `123e4567e89b12d3a456426614174000` |
| `setToken` | string | 是 | 管理员访问令牌 | `MySecureToken123` |
| `debug` | boolean | 是 | 调试模式开关 | `false` |
| `servers.serverConfig_x.serverName` | string | 否 | (x为第几个服务器信息)显示在页面的服务器名称 | `生存服` |
| `servers.serverConfig_x.serverIP` | string | 否 | (x为第几个服务器信息)游戏服务器IP地址 | `mc.example.com` |
| `servers.serverConfig_x.serverPORT` | number | 否 | (x为第几个服务器信息)游戏服务器端口 | `25565` |

4. 运行


**基础启动：**
```
node app.js
```

**自定义端口启动：**
```
# Windows
set PORT=3000 && node app.js

# Linux/macOS
PORT=3000 node app.js
```

5. 使用


目前拥有的命令：
```
notice [公告]     用于设置公告,留空则是关闭公告

exit    不用我多说吧，当然是退出啦
```

6. 如何区分管理端和客户端：


在主页链接后加上admin参数
比如：
```
http://localhost:3000     客户端

http://localhost:3000/?admin=[您设置的管理员令牌]     管理端
```


7. 在 PCL2 中使用：


前往 设置 -> 个性化 -> 主题 -> 联网更新
![屏幕截图 2025-04-12 114228](https://github.com/user-attachments/assets/978a61b0-11f6-4a6f-8a4a-6b33518cb26b)

![屏幕截图 2025-04-12 114352](https://github.com/user-attachments/assets/835d9d65-b641-42c6-9580-99708290d892)

在地址栏填入主页链接



----
**快捷加入服务器启动的是当前选择的版本** ***（本来是想做成启动对应版本的，但是没法通配指定版本。比如你想玩1.21.1的生电服你肯定是要启动带有辅助mod的版本，而我没办法帮你选择带有辅助模组的版本，只能帮你启动1.21.1原版。所以这个功能被我砍掉了，但是服务器信息卡片上会显示服务器版本）***


### 鸣谢
**YuShanNan**


https://github.com/YuShanNan/ChiLing-HomePage-PCL2


![](https://cdn.jsdelivr.net/gh/icelly-QAQ/PCL2-HomePage_iceLink/)

### 声明
该项目的mc服务器状态API使用的是 ***https://api.mcsrvstat.us/*** 如果出现主页响应缓慢可能是 api 的锅 qwq


![GPL-3.0](https://img.shields.io/badge/License-GPLv3-blue.svg)  
本作品采用[GPL-3.0](https://www.gnu.org/licenses/gpl-3.0)授权。


项目作者 icelly_QAQ
