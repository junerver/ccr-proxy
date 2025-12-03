# CCR Proxy Router

一个基于CCR的扩展项目，通过自定义路由器和Node.js代理中间件实现对不同AI服务的请求转发和路由管理。

## 项目概述

本项目解决了CCR（Claude Code Router）在多服务环境下的路由分发问题，允许通过不同的HTTP端点访问不同的AI服务后端，同时保持与CCR的原生兼容性。

## 核心功能

### 🚀 多服务路由支持
- **Anthropic Claude**: 通过 `/anthropic/*` 路由到 `new-api-free,claude-sonnet4-5`
- **智谱 GLM**: 通过 `/glm/*` 路由到 `ZhiPu,glm-4.6`
- **默认路由**: 未匹配的请求使用CCR默认路由策略

### 🔧 请求头注入
- 自动为请求添加 `X-CCR-ROUTE` 请求头
- 支持基于路径的路由识别
- 兼容CCR的 `CUSTOM_ROUTER_PATH` 配置

### 🌐 代理中间件
- 基于Node.js `http-proxy` 模块的反向代理
- 透明转发，保持原始请求结构
- 支持请求头修改和路径重写

## 项目结构

```
CCR/
├── custom-router.js      # CCR自定义路由器
├── proxy.js              # Node.js代理中间件
├── package.json          # 项目依赖配置
└── README.md            # 项目说明文档
```

## 快速开始

### 1. 环境准备

确保已安装Node.js环境，然后安装项目依赖：

```bash
npm install
```

### 2. 配置CCR

#### 2.1 CCR配置文件设置

`CUSTOM_ROUTER_PATH` 不是环境变量，而是CCR配置文件 `config.json` 中的一个字段。需要在CCR的配置文件中添加该字段指向项目的 `custom-router.js` 文件的**绝对路径**。

**找到CCR配置文件位置:**
- Windows: `%APPDATA%\Claude\config.json`
- macOS: `~/Library/Application Support/Claude/config.json`
- Linux: `~/.config/Claude/config.json`

**配置示例:**
```json
{
  "CUSTOM_ROUTER_PATH": "E:\\llm\\CCR\\custom-router.js",
  "other_settings": "..."
}
```

**不同操作系统的路径格式:**

**Windows:**
```json
{
  "CUSTOM_ROUTER_PATH": "E:\\llm\\CCR\\custom-router.js"
}
```

**Linux/macOS:**
```json
{
  "CUSTOM_ROUTER_PATH": "/absolute/path/to/your/CCR/custom-router.js"
}
```

**⚠️ 重要提示:**
- 必须使用**绝对路径**，相对路径可能导致CCR无法找到路由文件
- Windows路径中需要使用双反斜杠 `\\` 转义
- 修改配置文件后需要重启CCR才能生效
- 确保指定的文件存在且具有读取权限

#### 2.2 验证配置

1. **检查文件存在性:**
```bash
# Windows
dir "E:\llm\CCR\custom-router.js"

# Linux/macOS
ls -la /absolute/path/to/your/CCR/custom-router.js
```

2. **重启CCR应用** 使配置生效

3. **检查CCR日志** 确认自定义路由器是否正确加载

#### 2.3 配置文件示例

完整的CCR `config.json` 配置示例：
```json
{
  "CUSTOM_ROUTER_PATH": "E:\\llm\\CCR\\custom-router.js",
  "API_BASE_URL": "http://127.0.0.1:3456",
  "PROXY_URL": "http://127.0.0.1:8080",
  "TIMEOUT": 30000,
  "MAX_RETRIES": 3
}
```

### 3. 启动服务

#### 3.1 快速启动（开发/简单使用）

```bash
# 开发模式（使用nodemon自动重启）
npm run dev

# 生产模式（简单启动）
npm start
```

#### 3.2 PM2生产部署（推荐）

**步骤 1: 安装PM2**

```bash
# 全局安装PM2
npm install -g pm2

# 或使用yarn
yarn global add pm2
```

**步骤 2: 使用PM2启动项目**

```bash
# 使用ecosystem.config.js配置文件启动
pm2 start ecosystem.config.js

# 查看项目状态
pm2 status

# 查看实时日志
pm2 logs ccr-proxy

# 查看特定应用日志
pm2 logs ccr-proxy --lines 100

# 停止项目
pm2 stop ccr-proxy

# 重启项目
pm2 restart ccr-proxy

# 删除项目
pm2 delete ccr-proxy
```

**步骤 3: PM2开机自启配置**

```bash
# 保存当前PM2进程列表
pm2 save

# 生成开机自启脚本
pm2 startup

# 根据提示执行生成的命令（通常需要sudo权限）
# 例如：sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u <username> --hp /home/<username>
```

**步骤 4: 常用PM2监控命令**

```bash
# 监控所有进程
pm2 monit

# 查看详细信息
pm2 show ccr-proxy

# 查看日志文件位置
pm2 show ccr-proxy | grep log path

# 重载配置（不重启进程）
pm2 reload ccr-proxy

# 查看PM2版本和状态
pm2 --version
pm2 list
```

**⚡ 高级PM2配置**

- **集群模式**: 将 `ecosystem.config.js` 中的 `instances` 改为 `'max'` 启用多进程
- **内存限制**: 当进程超过 `max_memory_restart` 设定的内存时自动重启
- **环境切换**: 使用 `pm2 start ecosystem.config.js --env development` 启动开发环境

服务启动后将在 `http://127.0.0.1:8080` 提供代理服务。

### 4. 使用方式

#### 访问Anthropic Claude
```bash
curl -X POST http://127.0.0.1:8080/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet4-5", "messages": [{"role": "user", "content": "Hello"}]}'
```

#### 访问智谱GLM
```bash
curl -X POST http://127.0.0.1:8080/glm/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "glm-4.6", "messages": [{"role": "user", "content": "你好"}]}'
```

## 核心组件

### custom-router.js

CCR的自定义路由器，负责根据请求头或路径信息进行服务路由选择。

#### 主要功能

1. **请求头识别**: 读取 `X-CCR-ROUTE` 请求头
2. **路径识别**: 支持 `/anthropic/*` 和 `/glm/*` 路径匹配
3. **内容路由**: 基于消息内容的智能路由（如代码解释默认使用Claude）
4. **日志记录**: 详细的路由决策日志

#### 路由规则

```javascript
// Anthropic路由
if (headerRoute === 'anthropic' || path.startsWith('/anthropic')) {
    return 'new-api-free,claude-sonnet4-5';
}

// GLM路由
if (headerRoute === 'glm' || path.startsWith('/glm')) {
    return 'ZhiPu,glm-4.6';
}

// 内容路由
if (userMessage.includes('explain this code')) {
    return 'new-api-free,claude-sonnet4-5';
}
```

### proxy.js

基于 `http-proxy` 的反向代理中间件，负责HTTP请求的接收和转发。

#### 核心功能

1. **路径重写**: 移除路由前缀，转发纯净路径给CCR
2. **请求头注入**: 自动添加 `X-CCR-ROUTE` 请求头
3. **代理转发**: 将修改后的请求转发到CCR服务端
4. **路由映射**: 维护路径到服务的映射关系

#### 代理逻辑

```javascript
// Anthropic路径处理
if (url.startsWith('/anthropic/')) {
    req.url = url.replace(/^\/anthropic/, '') || '/';
    req.headers['x-ccr-route'] = 'anthropic';
}

// GLM路径处理
else if (url.startsWith('/glm/')) {
    req.url = url.replace(/^\/glm/, '') || '/';
    req.headers['x-ccr-route'] = 'glm';
}
```

## 配置说明

### 端口配置

- **代理服务端口**: `8080` (可在 `proxy.js` 中修改)
- **CCR服务端口**: `3456` (可在 `proxy.js` 中修改 `CCR_TARGET`)

### 路由配置

路由规则可在 `custom-router.js` 中修改：

```javascript
// 添加新的路由规则
if (headerRoute === 'new-service' || path.startsWith('/new-service')) {
    return 'service-provider,model-name';
}
```

### 日志配置

日志文件路径可在 `custom-router.js` 中修改：

```javascript
const LOGFILE = '/tmp/ccr_custom_router.log';
```

## 部署建议

### 开发环境

```bash
# 使用nodemon自动重启
npm run dev
```

### 生产环境

```bash
# 使用PM2管理进程
pm2 start proxy.js --name "ccr-proxy-router"

# 或使用systemd
sudo systemctl start ccr-proxy-router
```

### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["node", "proxy.js"]
```

## 监控和调试

### 日志查看

```bash
# 查看代理服务日志
tail -f /var/log/ccr-proxy-router.log

# 查看路由决策日志
tail -f /tmp/ccr_custom_router.log
```

### 常见问题排查

1. **路由不生效**: 检查 `CUSTOM_ROUTER_PATH` 环境变量设置
2. **代理连接失败**: 确认CCR服务在 `3456` 端口正常运行
3. **请求头丢失**: 检查代理中间件是否正确添加 `X-CCR-ROUTE` 头

## 扩展功能

### 添加新的AI服务

1. 在 `proxy.js` 中添加新的路径匹配规则
2. 在 `custom-router.js` 中添加对应的路由逻辑
3. 重启服务使配置生效

### 负载均衡支持

可扩展 `custom-router.js` 实现负载均衡：

```javascript
// 简单轮询示例
const anthropicInstances = ['anthropic-1', 'anthropic-2'];
const currentInstance = anthropicInstances[counter % anthropicInstances.length];
counter++;
return `${currentInstance},claude-sonnet4-5`;
```

## 许可证

MIT License

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

---

**注意**: 本项目依赖于CCR的正常运行，请确保在使用前正确安装和配置CCR。