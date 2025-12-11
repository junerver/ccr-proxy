/**
 * custom-router.js
 * 支持动态加载路由配置，支持热重载
 *  - 从 routes-config.json 读取路由规则
 *  - 支持通过 header X-CCR-ROUTE 或 path 前缀匹配
 *  - 配置文件修改后自动重载（可选）
 */
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'routes-config.json');
let config = null;
let lastMtime = null;
let LOGFILE = '/tmp/ccr_custom_router.log';

/**
 * 加载或重载配置文件
 */
function loadConfig() {
    try {
        const stats = fs.statSync(CONFIG_FILE);
        const currentMtime = stats.mtime.getTime();

        // 如果文件未修改且已有配置，直接返回
        if (config && lastMtime === currentMtime) {
            return config;
        }

        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        config = JSON.parse(data);
        lastMtime = currentMtime;

        // 更新日志文件路径
        if (config.settings && config.settings.logFile) {
            LOGFILE = config.settings.logFile;
        }

        log('Config loaded/reloaded successfully', `routes: ${config.routes.length}`);
        return config;
    } catch (err) {
        log('Error loading config', String(err));
        // 返回空配置以避免崩溃
        return { routes: [], settings: {} };
    }
}

/**
 * 日志记录函数
 */
function log(...args) {
    try {
        fs.appendFileSync(LOGFILE, new Date().toISOString() + ' ' + args.join(' ') + '\n');
    } catch (e) { }
}

/**
 * 路由匹配函数
 */
module.exports = async function router(req, config) {
    try {
        // 重载配置（如果启用了自动重载）
        const routeConfig = loadConfig();

        if (!routeConfig || !routeConfig.routes || routeConfig.routes.length === 0) {
            log('No routes configured');
            return null;
        }

        const headerName = routeConfig.settings?.headerName || 'x-ccr-route';
        const headerRoute = (
            req?.headers?.[headerName] ||
            req?.headers?.[headerName.toUpperCase()] ||
            req?.headers?.[headerName.toLowerCase()]
        )?.toString();

        const reqPath = req?.originalUrl || req?.url || req?.path || '';

        log('Router called', `header[${headerName}]=${headerRoute}`, `path=${reqPath}`);

        // 遍历所有路由规则进行匹配
        for (const route of routeConfig.routes) {
            // 跳过禁用的路由
            if (route.enabled === false) {
                continue;
            }

            // 匹配 header 或 path 前缀
            const matchHeader = headerRoute && headerRoute === route.headerValue;
            const matchPath = route.pathPrefix && reqPath.startsWith(route.pathPrefix);

            if (matchHeader || matchPath) {
                log(`=> Matched route: ${route.name}`, `target: ${route.target}`);
                return route.target;
            }
        }

        log('No route matched, using default');
        return null; // fallback to default router
    } catch (err) {
        log('Router error', String(err));
        return null;
    }
};

// 导出配置重载函数，方便手动触发
module.exports.reloadConfig = loadConfig;
module.exports.getConfig = () => config;
