/**
 * custom-router.js
 * 支持：
 *  - 代理注入 header X-CCR-ROUTE = "glm" / "anthropic"
 *  - 或直接通过 req.path/req.originalUrl 判断（如果 CCR 传入了原始 path）
 */
const fs = require('fs');
const LOGFILE = '/tmp/ccr_custom_router.log'; // 根据需要改路径

function log(...args) {
    try {
        fs.appendFileSync(LOGFILE, new Date().toISOString() + ' ' + args.join(' ') + '\n');
    } catch (e) { }
}

module.exports = async function router(req, config) {
    try {
        const headerRoute = (req?.headers?.['x-ccr-route'] || req?.headers?.['x-CCR-ROUTE'] || req?.headers?.['x-ccr-route'])?.toString();
        const path = req?.originalUrl || req?.url || req?.path || '';

        log('router called', 'headerRoute=' + headerRoute, 'path=' + path);

        if (headerRoute === 'anthropic' || path.startsWith('/anthropic')) {
            log('=> route to new-api-free,claude-sonnet4-5');
            return 'new-api-free,claude-sonnet4-5';
        }

        if (headerRoute === 'glm' || path.startsWith('/glm')) {
            log('=> route to ZhiPu,glm-4.6');
            return 'ZhiPu,glm-4.6';
        }

        // 其他逻辑仍可基于 body 判断
        const userMessage = req?.body?.messages?.find(m => m.role === 'user')?.content || '';
        if (userMessage.includes('explain this code')) {
            return 'new-api-free,claude-sonnet4-5';
        }

        return null; // fallback to default router
    } catch (err) {
        log('router error', String(err));
        return null;
    }
};
