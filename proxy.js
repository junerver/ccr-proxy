// proxy.js — 反向代理多路入口转发给 CCR

const http = require('http');
const httpProxy = require('http-proxy');

const CCR_TARGET = 'http://127.0.0.1:3456'; // CCR 默认端口
const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
    const url = req.url;

    // 路由入口 1：/blackwhite/*
    if (url.startsWith('/blackwhite/')) {
        req.url = url.replace(/^\/blackwhite/, '') || '/';
        req.headers['x-ccr-route'] = 'blackwhite';
        console.log('[ROUTE anthopic] ->', req.url);
    }

    // 路由入口 2：/glm/*
    else if (url.startsWith('/glm/')) {
        req.url = url.replace(/^\/glm/, '') || '/';
        req.headers['x-ccr-route'] = 'glm';
        console.log('[ROUTE glm] ->', req.url);
    }

    // **未匹配前缀则不进行标记，直接转发到 CCR，使用默认路由**
    else {
        console.log('[DEFAULT] ->', req.url);
    }

    proxy.web(req, res, { target: CCR_TARGET, changeOrigin: true });
});

// 监听端口（Node proxy入口）=====================
server.listen(8080, () => {
    console.log('🔶 Node CCR Proxy listening → http://127.0.0.1:8080');
    console.log('🔹 /glm/*       → ZhiPu,glm-4.6');
    console.log('🔹 /blackwhite/* → blackwhite,claude-sonnet-4.5-think');
});
