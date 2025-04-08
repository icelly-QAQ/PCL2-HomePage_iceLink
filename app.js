const fs = require('fs');
const path = require('path');

// 默认配置
const defaultConfig = {
    ip: "xxxx",      // 面板地址
    apikey: "xxxx",  // 面板API密钥
    setToken: "xxxx",  // 设置管理员令牌
    debug: false,     // 调试开关：true-显示调试信息，false-不显示任何信息
    serverConfig: {
        serverName: "",  // 服务器名称(可留空，留空时显示服务器地址)
        serverIP: "",  // 服务器地址(可留空，留空时不显示mc服务器状态)
        serverPORT: ""  // 服务器端口(可留空，默认为25565)
    }
};

// 配置文件路径
const configPath = path.join(__dirname, 'config.json');

// 读取或创建配置文件
let config;
try {
    if (fs.existsSync(configPath)) {
        // 如果配置文件存在，读取配置
        const configFile = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(configFile);
        console.log('已读取配置文件');
    } else {
        // 如果配置文件不存在，创建默认配置文件
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 4), 'utf8');
        config = defaultConfig;
        console.log('已创建默认配置文件，请修改 config.json 中的配置后重启程序');
        process.exit(1);
    }
} catch (error) {
    console.error('配置文件操作失败:', error);
    process.exit(1);
}

// 使用配置
const ip = config.ip;
const apikey = config.apikey;
const setToken = config.setToken;
const debug = config.debug;
const serverConfig = config.serverConfig;

let adminToken = '';  // 管理员令牌
let noticeContent = config.noticeContent || '';  // 从配置文件中读取公告内容

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
                    debug && console.log('API Response:', JSON.stringify(jsonData, null, 2));
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
                    debug && console.log('API Response:', JSON.stringify(jsonData, null, 2));
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

async function serveradmin(request) {
    try {
        // 获取并格式化数据
        const rawData = await fetchOverviewData();
        const data = await formatOverviewData(rawData);
        
        let serverNotice_xml = '';  // 初始化为空字符串
        
        if (noticeContent) {
            serverNotice_xml = `
<local:MyCard Title="服务器公告" Margin="0,0,0,15">
    <TextBlock 
        Text="${noticeContent}"
        FontSize="15"
        FontWeight="Bold"
        HorizontalAlignment="Left"
        VerticalAlignment="Top"
        Margin="15,30,15,15"
        TextWrapping="Wrap"
        MaxWidth="770"/>
</local:MyCard>
`
} else {
    serverNotice_xml = ``
}

// 初始化服务器信息变量
let serverInfo_xml = '';

        // 仅当 serverIP 存在时才获取并插入服务器信息
        if (serverConfig.serverIP) {
            const serverInfo = await getServerInfo();
            const protocolName = serverInfo.protocol?.name || '未知版本';
            const playersOnline = serverInfo.players?.online || 0;
            const playersMax = serverInfo.players?.max || 0;
            
            // 计算玩家数量字符串的长度并添加额外的15px
            const playerCountString = `${playersOnline}/${playersMax}`;
            const marginRight = playerCountString.length * 10 + 28; // 假设每个字符约10px宽
            
            serverInfo_xml = `
<local:MyCard Title="MC服务器信息" Margin="0,0,0,15">
    <Grid>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>
        
        <StackPanel Grid.Column="0">
            <TextBlock 
                Text="${serverConfig.serverName}"
                FontSize="18"
                FontWeight="Bold"
                HorizontalAlignment="Left"
                VerticalAlignment="Top"
                Margin="15,30,0,15"/>  
            <TextBlock 
                Text="服务器版本：${protocolName}"
                FontSize="18"
                FontWeight="Bold"
                HorizontalAlignment="Left"
                VerticalAlignment="Top"
                Margin="15,0,${marginRight},15"/>
            <TextBlock 
                Text="在线玩家：${playerCountString}"
                FontSize="18"
                FontWeight="Bold"
                HorizontalAlignment="Left"
                VerticalAlignment="Top"
                Margin="15,0,15,15"/>
        </StackPanel>
        
        <local:MyButton 
            Grid.Column="1"
            Text="加入服务器" 
            Margin="0,0,15,0" 
            EventType="启动游戏" 
            EventData="\\current|${serverConfig.serverIP}" 
            ToolTip="将会以当前版本加入${serverConfig.serverIP}" 
            Height="35" 
            Width="80"
            VerticalAlignment="Center"/>
    </Grid>
</local:MyCard>
`
        }
        
        // 使用模板字符串构建XML，使用API返回的数据
        const xml = `
<local:MyHint Text="提示:该主页为v0.1.4-Beta版，可能会出现许多BUG。另外，欢迎使用iceLink！" Margin="0,0,0,15" IsWarn="False"/>

${serverNotice_xml}
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

        <!-- 左上区块 -->
        <Border Grid.Row="0" Grid.Column="0" Margin="0,35,0,0" BorderThickness="1" BorderBrush="#44000000" CornerRadius="5">
            <StackPanel>
                <TextBlock Text="实例运行状态" 
                         FontSize="16" 
                         Margin="15,15,15,0"
                         FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.runningInstances}/${data.totalInstances}"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,15,0,15"/>
            </StackPanel>
        </Border>

        <!-- 右上区块 -->
        <Border Grid.Row="0" Grid.Column="2" Margin="0,35,0,0" BorderThickness="1" BorderBrush="#44000000" CornerRadius="5">
            <StackPanel>
                <TextBlock Text="节点在线数" 
                         FontSize="16" 
                         Margin="15,15,15,0"
                         FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.running}/${data.total}"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,15,0,15"/>
            </StackPanel>
        </Border>

        <!-- 左下区块 -->
        <Border Grid.Row="1" Grid.Column="0" Margin="0,15,0,0" BorderThickness="1" BorderBrush="#44000000" CornerRadius="5">
            <StackPanel>
                <TextBlock Text="系统资源信息" 
                         FontSize="16" 
                         Margin="15,15,15,0"
                         FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.cpuUsage}% ${data.memoryUsage}%"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,15,0,15"/>
            </StackPanel>
        </Border>

        <!-- 右下区块 -->
        <Border Grid.Row="1" Grid.Column="2" Margin="0,15,0,0" BorderThickness="1" BorderBrush="#44000000" CornerRadius="5">
            <StackPanel>
                <TextBlock Text="面板登录次数" 
                         FontSize="16" 
                         Margin="15,15,15,0"
                         FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.loginFailed}:${data.logined}"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,15,0,15"/>
            </StackPanel>
        </Border>
    </Grid>
</local:MyCard>

<local:MyCard Title="${data.nodeName}" Margin="0,0,0,15">
    <Grid Margin="15,0,15,15">
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="15"/>
            <ColumnDefinition Width="*"/>
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

<StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,15">
    <local:MyTextButton Text="iceLink" EventType="打开网页" EventData="https://github.com/icelly-QAQ/PCL2-HomePage_iceLink" FontSize="12" Foreground="#666666"/>
    <TextBlock Text=" By " Foreground="#666666" FontSize="12"/>
    <local:MyTextButton Text="icelly_QAQ" EventType="打开网页" EventData="https://github.com/icelly-QAQ" FontSize="12" Foreground="#666666"/>
</StackPanel>
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

async function clientInfo() {
    try {
        // 获取并格式化数据
        const rawData = await fetchOverviewData();
        const data = await formatOverviewData(rawData);
        
        let serverNotice_xml = '';  // 初始化为空字符串
        
        if (noticeContent) {
            serverNotice_xml = `
<local:MyCard Title="服务器公告" Margin="0,0,0,15">
    <TextBlock 
        Text="${noticeContent}"
        FontSize="15"
        FontWeight="Bold"
        HorizontalAlignment="Left"
        VerticalAlignment="Top"
        Margin="15,30,15,15"
        TextWrapping="Wrap"
        MaxWidth="770"/>
</local:MyCard>
`
} else {
    serverNotice_xml = ``  // 修改这里：将 serverInfo_xml 改为 serverNotice_xml
}

// 初始化服务器信息变量
let serverInfo_xml = '';  // 添加这一行：在条件判断前初始化 serverInfo_xml

        // 仅当 serverIP 存在时才获取并插入服务器信息
        if (serverConfig.serverIP) {
            const serverInfo = await getServerInfo();
            const protocolName = serverInfo.protocol?.name || '未知版本';
            const playersOnline = serverInfo.players?.online || 0;
            const playersMax = serverInfo.players?.max || 0;
            
            // 计算玩家数量字符串的长度并添加额外的15px
            const playerCountString = `${playersOnline}/${playersMax}`;
            const marginRight = playerCountString.length * 10 + 12; // 假设每个字符约10px宽
            
            serverInfo_xml = `
<local:MyCard Title="MC服务器信息" Margin="0,0,0,15">
    <Grid>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="*"/>
            <ColumnDefinition Width="Auto"/>
        </Grid.ColumnDefinitions>
        
        <StackPanel Grid.Column="0">
            <TextBlock 
                Text="${serverConfig.serverName}"
                FontSize="17"
                FontWeight="Bold"
                HorizontalAlignment="Left"
                VerticalAlignment="Top"
                Margin="15,30,0,15"/>  
            <TextBlock 
                Text="服务器版本：${protocolName}"
                FontSize="17"
                FontWeight="Bold"
                HorizontalAlignment="Left"
                VerticalAlignment="Top"
                Margin="15,0,${marginRight},15"/>
            <TextBlock 
                Text="在线玩家：${playerCountString}"
                FontSize="17"
                FontWeight="Bold"
                HorizontalAlignment="Left"
                VerticalAlignment="Top"
                Margin="15,0,15,15"/>
        </StackPanel>
        
        <local:MyButton 
            Grid.Column="1"
            Text="加入服务器" 
            Margin="0,0,15,0" 
            EventType="启动游戏" 
            EventData="\\current|${serverConfig.serverIP}" 
            ToolTip="将会以当前版本加入${serverConfig.serverIP}" 
            Height="35" 
            Width="80"
            VerticalAlignment="Center"/>
    </Grid>
</local:MyCard>
`
        }
        
        // 使用模板字符串构建XML，使用API返回的数据
        const xml = `
<local:MyHint Text="提示:该主页为v0.1.4-Beta版，可能会出现许多BUG。另外，欢迎使用蓝冰主页！" Margin="0,0,0,15" IsWarn="False"/>

${serverNotice_xml}
${serverInfo_xml}

<local:MyButton Text="刷新" Margin="0,0,0,15" EventType="刷新主页" Height="45"/>

<StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,15">
    <local:MyTextButton Text="iceLink" EventType="打开网页" EventData="https://github.com/icelly-QAQ/PCL2-HomePage_iceLink" FontSize="12" Foreground="#666666"/>
    <TextBlock Text=" By " Foreground="#666666" FontSize="12"/>
    <local:MyTextButton Text="icelly_QAQ" EventType="打开网页" EventData="https://github.com/icelly-QAQ" FontSize="12" Foreground="#666666"/>
</StackPanel>
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


const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const params = new URLSearchParams(url.search);
        
        // 检查是否存在admin参数，如果不存在则设为空
        adminToken = params.has('admin') ? params.get('admin') : '';
        debug && console.log(`传入的管理员令牌: ${adminToken}`);
        
        // 声明 response 变量
        let response;
        
        // 根据令牌选择返回内容
        if (adminToken === setToken) {
            response = await serveradmin(req);
        } else {
            response = await clientInfo();
        }

        res.writeHead(200, response.headers);
        res.end(await response.text());
    } catch (error) {
        debug && console.error('服务器错误:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
});

// 监听端口3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务正在[ ${PORT} ]端口运行`);
});

// 监听控制台输入
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    const args = input.trim().split(' ');
    const command = args[0].toLowerCase();

    if (command === 'notice') {
        noticeContent = args.slice(1).join(' ');
        // 更新配置文件中的公告内容
        config.noticeContent = noticeContent;
        try {
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4), 'utf8');
            console.log(`公告内容已更新为: ${noticeContent}`);
        } catch (error) {
            console.error('更新配置文件失败:', error);
        }
    }

    if (command === 'exit') {
        rl.close();
        process.exit();
    }
});

// 处理退出
process.on('SIGINT', () => {
    rl.close();
    process.exit();
});