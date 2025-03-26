const ip = "xxxx";      // 面板地址
const apikey = "xxxx";  // 面板API密钥

const http = require('http');

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
        logined: rawData.data.record.logined || 0
    };
}

async function handleRequest(request) {
    try {
        // 获取并格式化数据
        const rawData = await fetchOverviewData();
        const data = await formatOverviewData(rawData);

        
        
        // 使用模板字符串构建XML，使用API返回的数据
        const xml = `
<local:MyHint Text="提示:该主页为0.1.0-Beta版，可能会出现许多BUG" Margin="0,0,0,15" IsWarn="False"/>

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