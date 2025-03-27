/* 配置项start */

const ip = "xxxxx";      // 面板地址
const apikey = "xxxxx";  // 面板API密钥

const serverConfig = {
    serverName: "",  // 服务器名称(可留空，留空时显示服务器地址)
    serverIP: "xxxxx",  // 服务器地址(可留空，留空时不显示mc服务器状态)
    serverPORT: ""  // 服务器端口(可留空，默认为25565)
}

/* 配置项end */

const http = require('http');
const https = require('https');

async function fetchOverviewData() {
    return new Promise((resolve, reject) => {
        http.get(`http://${ip}/api/overview?apikey=${apikey}`, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('API Response:', JSON.stringify(jsonData, null, 2));
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function getServerInfo() {
    if (!serverConfig.serverName) {
        serverConfig.serverName = serverConfig.serverIP;
    }

    if (!serverConfig.serverIP) {
        return { online: '未配置' };
    }

    // 构建基础 URL，使用默认端口25565
    const port = serverConfig.serverPORT || '25565';
    const apiUrl = `https://api.mcsrvstat.us/3/${serverConfig.serverIP}:${port}`;

    // 添加请求选项，包括 User-Agent
    const options = {
        headers: {
            'User-Agent': 'PCL2-Home/1.0 (https://github.com/icellye/PCL2-home)',
            'Accept': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        https.get(apiUrl, options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('API Response:', JSON.stringify(jsonData, null, 2));
                    resolve(jsonData);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (error) => {
            reject(error);
        });
    });
}

async function formatOverviewData(rawData) {
    // 确保rawData存在，如果不存在则使用空对象
    rawData = rawData || {};
    
    // 设置默认值以防数据缺失
    return {
        // 实例运行状态
        runningInstances: rawData.data.remote[0].instance.running || 0,
        totalInstances: rawData.data.remote[0].instance.total || 0,
        
        // 节点在线数
        running: rawData.data.remoteCount.available || 0,
        total: rawData.data.remoteCount.total || 0,
        
        // 系统资源信息 - 使用Math.floor()取整
        cpuUsage: Math.floor(rawData.data.chart.system[3].cpu) || 0,
        memoryUsage: Math.floor(rawData.data.chart.system[3].mem) || 0,
        
        // 面板登录信息
        loginFailed: rawData.data.record.loginFailed || 0,
        logined: rawData.data.record.logined || 0,

        // 节点详情
        nodeName: rawData.data.remote[0].remarks || '未知',
        nodeIp: rawData.data.remote[0].ip || '未知',
        nodeVersion: rawData.data.remote[0].version || '未知'
    };
}

async function handleRequest(request) {
    try {
        // 获取并格式化数据
        const rawData = await fetchOverviewData();
        const data = await formatOverviewData(rawData);
        
        let serverInfo_xml = '';  // 初始化为空字符串
        
        // 仅当 serverIP 存在时才获取并插入服务器信息
        if (serverConfig.serverIP) {
            const serverInfo = await getServerInfo();
            serverInfo_xml = `
<local:MyCard Title="MC服务器信息" Margin="0,0,0,15">
    <TextBlock 
        Text="${serverConfig.serverName}"
        FontSize="15"
        FontWeight="Bold"
        HorizontalAlignment="Left"
        VerticalAlignment="Top"
        Margin="15,30,0,15"/>
    <local:MyButton Text="加入服务器" Margin="0,30,15,15" EventType="启动游戏" EventData="\current|${serverConfig.serverIP}" ToolTip="推荐以${serverInfo.protocol.name}加入${serverConfig.serverIP}" Height="25" Width="80"/>
    <TextBlock 
        Text="${serverInfo.players.online}/${serverInfo.players.max}"
        FontSize="15"
        FontWeight="Bold"
        HorizontalAlignment="Right"
        VerticalAlignment="Top"
        Margin="15,30,15,15"/>
</local:MyCard>`
        }
        
        // 使用模板字符串构建XML，使用API返回的数据
        const xml = `
<local:MyHint Text="提示:该主页为0.1.0-Beta版，可能会出现许多BUG" Margin="0,0,0,15" IsWarn="False"/>

${serverInfo_xml}

<local:MyCard Title="仪表盘" Margin="0,0,0,15">
    <Grid Margin="15,0,15,15">
        <Grid.RowDefinitions>
            <RowDefinition Height="*"/> <!-- 第一行 -->
            <RowDefinition Height="*"/> <!-- 第二行 -->
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/> <!-- 第一列 -->
            <ColumnDefinition Width="15"/> <!-- 分隔列（可选） -->
            <ColumnDefinition Width="*"/> <!-- 第二列 -->
        </Grid.ColumnDefinitions>

        <!-- 左上卡片 -->
        <local:MyCard Title="实例运行状态" Grid.Row="0" Grid.Column="0" Margin="0,35,0,0">
            <Grid>
                <TextBlock 
                    Text="${data.runningInstances}/${data.totalInstances}"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,30,0,15"/>
            </Grid>
        </local:MyCard>

        <!-- 右上卡片 -->
        <local:MyCard Title="节点在线数" Grid.Row="0" Grid.Column="2" Margin="0,35,0,0">
            <Grid>
                <TextBlock 
                    Text="${data.running}/${data.total}"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,30,0,15"/>
            </Grid>
        </local:MyCard>

        <!-- 左下卡片 -->
        <local:MyCard Title="系统资源信息" Grid.Row="1" Grid.Column="0" Margin="0,15,0,0">
            <Grid>
                <TextBlock 
                    Text="${data.cpuUsage}% ${data.memoryUsage}%"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,30,0,15"/>
            </Grid>
        </local:MyCard>

        <!-- 右下卡片 -->
        <local:MyCard Title="面板登录次数" Grid.Row="1" Grid.Column="2" Margin="0,15,0,0">
            <Grid>
                <TextBlock 
                    Text="${data.loginFailed}:${data.logined}"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,30,0,15"/>
            </Grid>
        </local:MyCard>
    </Grid>
</local:MyCard>

<local:MyCard Title="${data.nodeName}" Margin="0,0,0,15">
    <Grid Margin="15,0,15,15">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/> <!-- 第一列 -->
            <ColumnDefinition Width="15"/> <!-- 分隔列（可选） -->
            <ColumnDefinition Width="*"/> <!-- 第二列 -->
        </Grid.ColumnDefinitions>

        <local:MyCard Title="节点地址" Grid.Row="1" Grid.Column="0" Margin="0,35,0,0" Background="Transparent">
            <Grid>
                <TextBlock 
                    Text="${data.nodeIp}"
                    FontSize="20"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,30,0,15"/>
            </Grid>
        </local:MyCard>

        <local:MyCard Title="节点版本" Grid.Row="1" Grid.Column="2" Margin="0,35,0,0" Background="Transparent">
            <Grid>
                <TextBlock 
                    Text="${data.nodeVersion}"
                    FontSize="20"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,30,0,15"/>
            </Grid>
        </local:MyCard>
    </Grid>
</local:MyCard>

<local:MyHint Text="提示:当存在多个节点时默认显示第一个节点" Margin="0,0,0,15" IsWarn="False"/>

<local:MyButton Text="刷新" Margin="0,0,0,15" EventType="刷新主页" Height="45"/>
`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'text/html',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (error) {
        return new Response(`Error: ${error.message}`, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain',
            },
        });
    }
}

// 创建HTTP服务器
const server = http.createServer(async (req, res) => {
    try {
        const response = await handleRequest(req);
        res.writeHead(200, response.headers);
        res.end(await response.text());
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

// 监听端口3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
