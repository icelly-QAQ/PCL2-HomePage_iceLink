const fs = require('fs');
const path = require('path');

// 默认配置
const defaultConfig = {
    ip: "xxxx",      // 面板地址
    apikey: "xxxx",  // 面板API密钥
    setToken: "xxxx",  // 设置管理员令牌
    debug: false,     // 调试开关：true-显示调试信息，false-不显示任何信息
    servers: {
        serverConfig_1: {
            serverName: "",  // 服务器名称(可留空，留空时显示服务器地址)
            serverIP: "",  // 服务器地址(可留空，留空时不显示mc服务器状态)
            serverPORT: ""  // 服务器端口(可留空，默认为25565)
        },
        serverConfig_2: {
            serverName: "",  // 服务器名称(可留空，留空时显示服务器地址)
            serverIP: "",  // 服务器地址(可留空，留空时不显示mc服务器状态)
            serverPORT: ""  // 服务器端口(可留空，默认为25565)
        },
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
    // 创建一个通用的请求处理函数
    const makeRequest = (protocol) => {
        return new Promise((resolve, reject) => {
            const client = protocol === 'https' ? https : http;
            const url = `${protocol}://${ip}/api/overview?apikey=${apikey}`;
            
            client.get(url, (res) => {
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
    };

    try {
        // 首先尝试 HTTP 请求
        debug && console.log('尝试使用 HTTP 请求...');
        return await makeRequest('http');
    } catch (httpError) {
        debug && console.log('HTTP 请求失败，尝试使用 HTTPS...');
        try {
            // HTTP 失败后尝试 HTTPS
            return await makeRequest('https');
        } catch (httpsError) {
            // 两种协议都失败时
            console.error('面板连接失败：无法连接到面板地址');
            throw new Error('面板地址无效或无法连接');
        }
    }
}

// 修改 getServerInfo 函数
async function getServerInfo(serverConfig) {
    if (!serverConfig || !serverConfig.serverIP) {
        return { 
            protocol: { name: '未知版本' },
            players: { online: 0, max: 0 }
        };
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
        const rawData = await fetchOverviewData();
        const data = await formatOverviewData(rawData);
        
        let serverNotice_xml = '';
        
        if (noticeContent) {
            serverNotice_xml = `
<local:MyCard Title="服务器公告" Margin="0,0,0,15">
    <TextBlock 
        Text="${noticeContent}"
        FontSize="15"
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


let serverInfo_xml = `
<local:MyCard Title="MC服务器信息" Margin="0,0,0,15">
    <StackPanel>
`;


let isFirst = true;
for (const [configKey, serverConfig] of Object.entries(config.servers)) {
    if (serverConfig.serverIP) {
        // 如果不是第一个服务器，添加分隔线
        if (!isFirst) {
            serverInfo_xml += `
        <Border Height="1" Background="#22000000" Margin="15,0,15,0"/>`;
        }

        const serverInfo = await getServerInfo(serverConfig);
        const protocolName = serverInfo.protocol?.name || '未知版本';
        const playersOnline = serverInfo.players?.online || 0;
        const playersMax = serverInfo.players?.max || 0;
        
        const playerCountString = `${playersOnline}/${playersMax}`;
        const marginRight = playerCountString.length * 10 + 28;
        

        serverInfo_xml += `
        <Grid Margin="15,${isFirst ? '35' : '15'},15,15">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>
            
            <StackPanel Grid.Column="0">
                <TextBlock 
                    Text="${serverConfig.serverName || serverConfig.serverIP}"
                    FontSize="18"
                    FontWeight="Bold"
                    HorizontalAlignment="Left"
                    VerticalAlignment="Top"
                    Margin="0,0,0,15"/>  
                <TextBlock 
                    Text="服务器版本：${protocolName}"
                    FontSize="18"
                    FontWeight="Bold"
                    HorizontalAlignment="Left"
                    VerticalAlignment="Top"
                    Margin="0,0,${marginRight},15"/>
                <TextBlock 
                    Text="在线玩家：${playerCountString}"
                    FontSize="18"
                    FontWeight="Bold"
                    HorizontalAlignment="Left"
                    VerticalAlignment="Top"
                    Margin="0,0,0,0"/>
            </StackPanel>
            
            <StackPanel Grid.Column="1" VerticalAlignment="Center">
                <local:MyButton 
                    Text="加入服务器" 
                    Margin="0,0,15,8" 
                    EventType="启动游戏" 
                    EventData="\\current|${serverConfig.serverIP}${serverConfig.serverPORT ? ':' + serverConfig.serverPORT : ''}" 
                    ToolTip="将会以当前版本加入${serverConfig.serverIP}" 
                    Height="35" 
                    Width="80"/>
                <local:MyButton 
                    Text="复制地址" 
                    Margin="0,8,15,0" 
                    EventType="复制文本" 
                    EventData="${serverConfig.serverIP}${serverConfig.serverPORT ? ':' + serverConfig.serverPORT : ''}" 
                    ToolTip="复制服务器地址" 
                    Height="35" 
                    Width="80"/>
            </StackPanel>
        </Grid>`;
        
        isFirst = false;
    }
}

serverInfo_xml += `
    </StackPanel>
</local:MyCard>`;


const xml = `
<StackPanel.Resources>
    <SolidColorBrush x:Key="IconBrush" Color="#4A90E2"/>
    
    <Style x:Key="AnimatedPathStyle" TargetType="Path">
        <Setter Property="RenderTransformOrigin" Value="0.5,0.5"/>
        <Setter Property="RenderTransform">
            <Setter.Value>
                <RotateTransform Angle="0"/>
            </Setter.Value>
        </Setter>
        <Style.Triggers>
            <EventTrigger RoutedEvent="MouseLeftButtonDown">
                <BeginStoryboard>
                    <Storyboard>
                        <DoubleAnimation 
                            Storyboard.TargetProperty="(Path.RenderTransform).(RotateTransform.Angle)"
                            From="0" To="360" Duration="0:0:0.5"/>
                    </Storyboard>
                </BeginStoryboard>
            </EventTrigger>
        </Style.Triggers>
    </Style>
</StackPanel.Resources>
 
<local:MyCard Margin="-25,-25,-25,15">
    <TextBlock Text="iceLink主页"
        HorizontalAlignment="Left" 
        FontSize="12" 
        Margin="12,12,12,12"
        FontWeight="Bold"/>
    <TextBlock Text="v1.8"
        HorizontalAlignment="Left" 
        FontSize="10" 
        Margin="80,14,12,12"/>
    <TextBlock Text="给 iceLink 点个 star 吧~"
        Foreground="{DynamicResource ColorBrush2}"
        HorizontalAlignment="Right" 
        FontSize="12" 
        Margin="12,12,50,12"/>
    <local:MyIconButton 
        Margin="0,10,15,10" 
        Width="15" 
        Height="15" 
        HorizontalAlignment="Right" 
        ToolTip="刷新" 
        EventType="刷新主页">
        <Path 
            Stretch="Uniform"
            Width="15" 
            Height="15" 
            Style="{StaticResource AnimatedPathStyle}"
            Data="M7.5,0.7 C11.6,0.7 15,4.1 15,8.2 C15,12.3 11.6,15.7 7.5,15.7 C4.6,15.7 2.1,14.1 0.7,11.7 L2.3,10.9 C3.4,12.8 5.3,14 7.5,14 C10.6,14 13.2,11.4 13.2,8.2 C13.2,5.1 10.6,2.4 7.5,2.4 C5.3,2.4 3.4,3.7 2.3,5.6 L4.3,7.1 L0,7.1 L0,2.8 L1.6,4.1 C3.1,2 5.2,0.7 7.5,0.7 Z"
            Fill="{StaticResource IconBrush}"/>
    </local:MyIconButton>
</local:MyCard>

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
                <TextBlock Text="正在运行数 / 全部实例总数" 
                    FontSize="10" 
                    Margin="16,5,5,0"
                    Foreground="#666666"
                    FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.runningInstances}/${data.totalInstances}"
                    FontSize="30"
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
                <TextBlock Text="在线节点 / 总节点" 
                    FontSize="10" 
                    Margin="16,5,5,0"
                    Foreground="#666666"
                    FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.running}/${data.total}"
                    FontSize="30"
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
                <TextBlock Text="面板主机 CPU，RAM 使用率" 
                    FontSize="10" 
                    Margin="16,5,5,0"
                    Foreground="#666666"
                    FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.cpuUsage}% ${data.memoryUsage}%"
                    FontSize="30"
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
                <TextBlock Text="登录失败次数 : 登录成功次数" 
                    FontSize="10" 
                    Margin="16,5,5,0"
                    Foreground="#666666"
                    FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.loginFailed}:${data.logined}"
                    FontSize="30"
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
            <ColumnDefinition Width="*"/> <!-- 第一列 -->
            <ColumnDefinition Width="15"/> <!-- 分隔列 -->
            <ColumnDefinition Width="*"/> <!-- 第二列 -->
        </Grid.ColumnDefinitions>

        <!-- 左侧区块 -->
        <Border Grid.Column="0" Margin="0,35,0,0" BorderThickness="1" BorderBrush="#44000000" CornerRadius="5">
            <StackPanel>
                <TextBlock 
                    Text="节点地址" 
                    FontSize="13" 
                    Margin="15,15,15,0"
                    FontWeight="Bold"/>
                <local:MyTextButton 
                    Text="${data.nodeIp}"
                    FontSize="35"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,15,0,15"
                    EventType="复制文本"
                    EventData="${data.nodeIp}"
                    Foreground="#000000"/>
            </StackPanel>
        </Border>

        <!-- 右侧区块 -->
        <Border Grid.Column="2" Margin="0,35,0,0" BorderThickness="1" BorderBrush="#44000000" CornerRadius="5">
            <StackPanel>
                <TextBlock
                    Text="节点版本" 
                    FontSize="13" 
                    Margin="15,15,15,0"
                    FontWeight="Bold"/>
                <TextBlock 
                    Text="${data.nodeVersion}"
                    FontSize="15"
                    FontWeight="Bold"
                    HorizontalAlignment="Center"
                    VerticalAlignment="Top"
                    Margin="0,15,0,15"/>
            </StackPanel>
        </Border>
    </Grid>
</local:MyCard>

<StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,15">
    <local:MyTextButton Text="iceLink" EventType="打开网页" EventData="https://github.com/icelly-QAQ/PCL2-HomePage_iceLink" FontSize="12" Foreground="#666666"/>
    <TextBlock Text=" By " Foreground="#666666" FontSize="12"/>
    <local:MyTextButton Text="icelly_QAQ" EventType="打开网页" EventData="https://github.com/icelly-QAQ" FontSize="12" Foreground="#666666"/>
</StackPanel>
`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (error) {
        return new Response(`Error: ${error.message}`, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    }
}

async function clientInfo() {
    try {
        const rawData = await fetchOverviewData();
        const data = await formatOverviewData(rawData);
        
        let serverNotice_xml = '';
        
        if (noticeContent) {
            serverNotice_xml = `
<local:MyCard Title="服务器公告" Margin="0,0,0,15">
    <TextBlock 
        Text="${noticeContent}"
        FontSize="15"
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


let serverInfo_xml = `
<local:MyCard Title="MC服务器信息" Margin="0,0,0,15">
    <StackPanel>
`;


let isFirst = true;
for (const [configKey, serverConfig] of Object.entries(config.servers)) {
    if (serverConfig.serverIP) {
        // 如果不是第一个服务器，添加分隔线
        if (!isFirst) {
            serverInfo_xml += `
        <Border Height="1" Background="#22000000" Margin="15,0,15,0"/>`;
        }

        const serverInfo = await getServerInfo(serverConfig);
        const protocolName = serverInfo.protocol?.name || '未知版本';
        const playersOnline = serverInfo.players?.online || 0;
        const playersMax = serverInfo.players?.max || 0;
        
        const playerCountString = `${playersOnline}/${playersMax}`;
        const marginRight = playerCountString.length * 10 + 28;
        
        // 添加服务器信息
        serverInfo_xml += `
        <Grid Margin="15,${isFirst ? '35' : '15'},15,15">
            <Grid.ColumnDefinitions>
                <ColumnDefinition Width="*"/>
                <ColumnDefinition Width="Auto"/>
            </Grid.ColumnDefinitions>
            
            <StackPanel Grid.Column="0">
                <TextBlock 
                    Text="${serverConfig.serverName || serverConfig.serverIP}"
                    FontSize="18"
                    FontWeight="Bold"
                    HorizontalAlignment="Left"
                    VerticalAlignment="Top"
                    Margin="0,0,0,15"/>  
                <TextBlock 
                    Text="服务器版本：${protocolName}"
                    FontSize="18"
                    FontWeight="Bold"
                    HorizontalAlignment="Left"
                    VerticalAlignment="Top"
                    Margin="0,0,${marginRight},15"/>
                <TextBlock 
                    Text="在线玩家：${playerCountString}"
                    FontSize="18"
                    FontWeight="Bold"
                    HorizontalAlignment="Left"
                    VerticalAlignment="Top"
                    Margin="0,0,0,0"/>
            </StackPanel>
            
            <StackPanel Grid.Column="1" VerticalAlignment="Center">
                <local:MyButton 
                    Text="加入服务器" 
                    Margin="0,0,15,8" 
                    EventType="启动游戏" 
                    EventData="\\current|${serverConfig.serverIP}${serverConfig.serverPORT ? ':' + serverConfig.serverPORT : ''}" 
                    ToolTip="将会以当前版本加入${serverConfig.serverIP}" 
                    Height="35" 
                    Width="80"/>
                <local:MyButton 
                    Text="复制地址" 
                    Margin="0,8,15,0" 
                    EventType="复制文本" 
                    EventData="${serverConfig.serverIP}${serverConfig.serverPORT ? ':' + serverConfig.serverPORT : ''}" 
                    ToolTip="复制服务器地址" 
                    Height="35" 
                    Width="80"/>
            </StackPanel>
        </Grid>`;
        
        isFirst = false;
    }
}

serverInfo_xml += `
    </StackPanel>
</local:MyCard>`;


const xml = `
<StackPanel.Resources>
    <SolidColorBrush x:Key="IconBrush" Color="#4A90E2"/>
    
    <Style x:Key="AnimatedPathStyle" TargetType="Path">
        <Setter Property="RenderTransformOrigin" Value="0.5,0.5"/>
        <Setter Property="RenderTransform">
            <Setter.Value>
                <RotateTransform Angle="0"/>
            </Setter.Value>
        </Setter>
        <Style.Triggers>
            <EventTrigger RoutedEvent="MouseLeftButtonDown">
                <BeginStoryboard>
                    <Storyboard>
                        <DoubleAnimation 
                            Storyboard.TargetProperty="(Path.RenderTransform).(RotateTransform.Angle)"
                            From="0" To="360" Duration="0:0:0.5"/>
                    </Storyboard>
                </BeginStoryboard>
            </EventTrigger>
        </Style.Triggers>
    </Style>
</StackPanel.Resources>
 
<local:MyCard Margin="-25,-25,-25,15">
    <TextBlock Text="iceLink主页"
        HorizontalAlignment="Left" 
        FontSize="12" 
        Margin="12,12,12,12"
        FontWeight="Bold"/>
    <TextBlock Text="v1.8"
        HorizontalAlignment="Left" 
        FontSize="10" 
        Margin="80,14,12,12"/>
    <TextBlock Text="给 iceLink 点个 star 吧~"
        Foreground="{DynamicResource ColorBrush2}"
        HorizontalAlignment="Right" 
        FontSize="12" 
        Margin="12,12,50,12"/>
    <local:MyIconButton 
        Margin="0,10,15,10" 
        Width="15" 
        Height="15" 
        HorizontalAlignment="Right" 
        ToolTip="刷新" 
        EventType="刷新主页">
        <Path 
            Stretch="Uniform"
            Width="15" 
            Height="15" 
            Style="{StaticResource AnimatedPathStyle}"
            Data="M7.5,0.7 C11.6,0.7 15,4.1 15,8.2 C15,12.3 11.6,15.7 7.5,15.7 C4.6,15.7 2.1,14.1 0.7,11.7 L2.3,10.9 C3.4,12.8 5.3,14 7.5,14 C10.6,14 13.2,11.4 13.2,8.2 C13.2,5.1 10.6,2.4 7.5,2.4 C5.3,2.4 3.4,3.7 2.3,5.6 L4.3,7.1 L0,7.1 L0,2.8 L1.6,4.1 C3.1,2 5.2,0.7 7.5,0.7 Z"
            Fill="{StaticResource IconBrush}"/>
    </local:MyIconButton>
</local:MyCard>

${serverNotice_xml}
${serverInfo_xml}

<StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,0,0,15">
    <local:MyTextButton Text="iceLink" EventType="打开网页" EventData="https://github.com/icelly-QAQ/PCL2-HomePage_iceLink" FontSize="12" Foreground="#666666"/>
    <TextBlock Text=" By " Foreground="#666666" FontSize="12"/>
    <local:MyTextButton Text="icelly_QAQ" EventType="打开网页" EventData="https://github.com/icelly-QAQ" FontSize="12" Foreground="#666666"/>
</StackPanel>
`;

        return new Response(xml, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=300',
            },
        });
    } catch (error) {
        return new Response(`Error: ${error.message}`, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
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
        
        let response;
        
        // 根据令牌选择返回内容
        if (adminToken === setToken) {
            response = await serveradmin(req);
        } else {
            response = await clientInfo();
        }

        res.writeHead(200, {
            ...response.headers,
            'Content-Type': 'text/html; charset=utf-8'
        });
        res.end(await response.text());
    } catch (error) {
        debug && console.error('服务器错误:', error);
        res.writeHead(500, { 
            'Content-Type': 'text/plain; charset=utf-8'
        });
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
