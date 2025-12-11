# CCR 动态路由代理系统

## 概述

这是一个支持动态配置、热重载的 CCR (Claude Code Router) 反向代理系统。通过配置文件管理路由规则，无需修改代码即可扩展新的端点。

## 架构改进

### 原有问题

- ❌ 路由规则硬编码在 `custom-router.js` 和 `proxy.js` 中
- ❌ 添加新路由需要修改代码并重启服务
- ❌ 维护困难，配置分散

### 改进方案

- ✅ 统一的 JSON 配置文件 (`routes-config.json`)
- ✅ 支持热重载，修改配置无需重启服务
- ✅ 易于扩展，添加新路由只需修改配置文件
- ✅ 配置集中管理，便于维护

## 文件结构

```
CCR/
├── routes-config.json      # 路由配置文件（新增）
├── custom-router.js        # 自定义路由器（已重构）
├── proxy.js                # 反向代理服务（已重构）
├── ecosystem.config.js     # PM2 配置
└── package.json
```

## 配置文件说明

### routes-config.json

```json
{
  "routes": [
    {
      "name": "blackwhite", // 路由名称
      "pathPrefix": "/blackwhite", // URL 路径前缀
      "headerValue": "blackwhite", // Header 标识值
      "target": "blackwhite,claude-sonnet-4.5-think", // CCR 目标
      "description": "Anthropic Claude route", // 描述
      "enabled": true // 是否启用
    }
  ],
  "settings": {
    "headerName": "x-ccr-route", // 自定义 Header 名称
    "logFile": "/tmp/ccr_custom_router.log", // 日志文件路径
    "autoReload": true, // 是否自动重载
    "reloadInterval": 5000 // 重载检查间隔（毫秒）
  }
}
```

## 如何添加新路由

### 方法 1: 直接编辑配置文件

编辑 `routes-config.json`，在 `routes` 数组中添加新路由：

```json
{
  "name": "openai",
  "pathPrefix": "/openai",
  "headerValue": "openai",
  "target": "OpenAI,gpt-4",
  "description": "OpenAI GPT-4 route",
  "enabled": true
}
```

保存后，代理服务会自动检测并重载配置（无需重启）。

### 方法 2: 使用命令行工具（可选）

可以创建一个简单的管理脚本来添加/删除路由：

```bash
# 添加路由
node manage-routes.js add --name openai --prefix /openai --target "OpenAI,gpt-4"

# 禁用路由
node manage-routes.js disable --name openai

# 列出所有路由
node manage-routes.js list
```

## 使用示例

### 启动服务

```bash
# 开发模式
node proxy.js

# 使用 PM2（生产环境推荐）
pm2 start ecosystem.config.js
```

### 访问端点

```bash
# 访问 blackwhite 路由
curl http://localhost:8080/blackwhite/v1/chat/completions

# 访问 glm 路由
curl http://localhost:8080/glm/v1/chat/completions

# 使用默认路由
curl http://localhost:8080/v1/chat/completions
```

### 使用自定义 Header

```bash
curl -H "x-ccr-route: blackwhite" http://localhost:8080/v1/chat/completions
```

## 热重载功能

### 自动热重载

- `proxy.js` 使用 `fs.watch()` 监听配置文件变化
- `custom-router.js` 每次请求时检查文件修改时间
- 配置修改后自动生效，无需重启服务

### 手动重载（可选）

如果需要手动触发重载：

```javascript
const router = require("./custom-router");
router.reloadConfig();
```

## 路由匹配逻辑

优先级：路径前缀 > Header 标识 > 默认路由

1. **路径前缀匹配**: `/blackwhite/xxx` → blackwhite 路由
2. **Header 匹配**: `x-ccr-route: glm` → glm 路由
3. **默认路由**: 其他请求 → CCR 默认处理

## 日志

路由日志默认写入 `/tmp/ccr_custom_router.log`，可在配置文件中修改：

```bash
# 查看路由日志
tail -f /tmp/ccr_custom_router.log

# 查看代理日志
pm2 logs proxy
```

## 配置示例

### 多端点配置

```json
{
  "routes": [
    {
      "name": "anthropic",
      "pathPrefix": "/anthropic",
      "headerValue": "anthropic",
      "target": "blackwhite,claude-sonnet-4.5-think",
      "description": "Anthropic Claude",
      "enabled": true
    },
    {
      "name": "zhipu",
      "pathPrefix": "/zhipu",
      "headerValue": "zhipu",
      "target": "ZhiPu,glm-4.6",
      "description": "ZhiPu GLM",
      "enabled": true
    },
    {
      "name": "openai",
      "pathPrefix": "/openai",
      "headerValue": "openai",
      "target": "OpenAI,gpt-4-turbo",
      "description": "OpenAI GPT-4 Turbo",
      "enabled": true
    },
    {
      "name": "gemini",
      "pathPrefix": "/gemini",
      "headerValue": "gemini",
      "target": "Google,gemini-pro",
      "description": "Google Gemini Pro",
      "enabled": false
    }
  ],
  "settings": {
    "headerName": "x-ccr-route",
    "logFile": "/var/log/ccr_router.log",
    "autoReload": true
  }
}
```

## 优势

1. **易于维护**: 配置集中在一个 JSON 文件中
2. **热重载**: 修改配置后自动生效，无需重启
3. **灵活扩展**: 添加新路由只需编辑配置文件
4. **开关控制**: 通过 `enabled` 字段快速启用/禁用路由
5. **清晰的日志**: 记录所有路由匹配和转发信息

## 注意事项

1. 配置文件格式必须是有效的 JSON
2. `pathPrefix` 应该以 `/` 开头，不应以 `/` 结尾
3. 修改配置后，`proxy.js` 会立即生效，`custom-router.js` 在下次请求时生效
4. 确保 CCR 服务已启动在 `http://127.0.0.1:3456`
5. 禁用的路由（`enabled: false`）会被跳过

## 故障排查

### 配置未生效

- 检查 JSON 格式是否正确
- 查看日志文件确认配置是否加载成功
- 确认文件保存后等待几秒钟

### 代理无法连接

- 确认 CCR 服务是否运行
- 检查 `CCR_TARGET` 端口是否正确
- 查看 `pm2 logs` 获取详细错误信息

## 未来扩展

可以进一步增强的功能：

- Web 管理界面
- API 接口管理路由
- 路由统计和监控
- 负载均衡支持
- 高级匹配规则（正则表达式）
