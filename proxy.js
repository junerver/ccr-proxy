// proxy.js — 反向代理多路入口转发给 CCR
// 支持动态路由配置，从 routes-config.json 加载

const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const CCR_TARGET = 'http://127.0.0.1:3456'; // CCR 默认端口
const CONFIG_FILE = path.join(__dirname, 'routes-config.json');
const proxy = httpProxy.createProxyServer({});

let routesConfig = null;

/**
 * 加载路由配置
 */
function loadRoutesConfig() {
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        routesConfig = JSON.parse(data);
        console.log(`✅ Routes config loaded: ${routesConfig.routes.length} routes`);
        return routesConfig;
    } catch (err) {
        console.error('❌ Error loading routes config:', err.message);
        return { routes: [], settings: {} };
    }
}

/**
 * 监听配置文件变化（热重载）
 */
function watchConfigFile() {
    fs.watch(CONFIG_FILE, (eventType) => {
        if (eventType === 'change') {
            console.log('🔄 Config file changed, reloading...');
            setTimeout(() => {
                loadRoutesConfig();
                displayRoutes();
            }, 100); // 延迟以确保文件写入完成
        }
    });
    console.log('👀 Watching config file for changes...');
}

/**
 * 显示当前路由配置
 */
function displayRoutes() {
    if (!routesConfig || !routesConfig.routes) return;

    console.log('\n📋 Current Routes:');
    routesConfig.routes.forEach(route => {
        if (route.enabled !== false) {
            console.log(`🔹 ${route.pathPrefix} → ${route.target} (${route.description})`);
        }
    });
    console.log('');
}

// 初始加载配置
loadRoutesConfig();

const server = http.createServer((req, res) => {
    const url = req.url;
    let matched = false;

    // 如果配置未加载，使用默认行为
    if (!routesConfig || !routesConfig.routes) {
        console.log('[DEFAULT] ->', req.url);
        proxy.web(req, res, { target: CCR_TARGET, changeOrigin: true });
        return;
    }

    const headerName = routesConfig.settings?.headerName || 'x-ccr-route';

    // 遍历所有路由规则
    for (const route of routesConfig.routes) {
        // 跳过禁用的路由
        if (route.enabled === false) {
            continue;
        }

        // 检查路径前缀匹配
        if (route.pathPrefix && url.startsWith(route.pathPrefix + '/')) {
            // 去除路径前缀
            req.url = url.replace(new RegExp(`^${route.pathPrefix}`), '') || '/';
            // 设置路由标识 header
            req.headers[headerName] = route.headerValue;
            console.log(`[ROUTE ${route.name}] ${url} -> ${req.url}`);
            matched = true;
            break;
        }
    }

    // 未匹配任何路由，使用默认
    if (!matched) {
        console.log('[DEFAULT] ->', req.url);
    }

    proxy.web(req, res, { target: CCR_TARGET, changeOrigin: true });
});

// 错误处理
proxy.on('error', (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: Unable to reach CCR service');
    }
});

// 监听端口（Node proxy入口）
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🔶 Node CCR Proxy listening → http://127.0.0.1:${PORT}`);
    console.log(`🎯 CCR Target: ${CCR_TARGET}`);
    displayRoutes();
    console.log('═══════════════════════════════════════════════════════');

    // 启动配置文件监听
    watchConfigFile();
});
