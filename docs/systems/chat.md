# 实时聊天室设计与接入说明

适用范围：Cloudflare Pages + Functions + Durable Object 版本的实时聊天室（入口为悬浮助手头像）。

## 架构
- 前端：`index.html`/`index.css`/`pages/subject_monitor.js` 内置聊天面板，点击助手头像打开/关闭。
- 后端：Pages Functions 暴露 `/ws`，由 Durable Object `ChatRoom` 管理连接与广播（见 `functions/ws.js`）。
- 存储：DO 内存保存最近 50 条消息，会随实例重启清空；本地开发可 `--persist-to` 保持状态。

## 消息格式
- 发送：`{ user: string, text: string }`，前端自动截断 `user <= 32` 字符、`text <= 320` 字符。
- 接收：
  - 历史：`{ type: "history", messages: Message[] }`
  - 广播：`{ type: "chat", user, text, ts }`

## 昵称与入口
- 昵称取自登录保存的 `localStorage.fog_station_user.username`，无则使用“研究员”。
- 悬浮助手头像点击切换聊天面板；拖拽头像不会误触开关。

## 本地开发
- 启动本地模拟（含 DO）：`wrangler pages dev . --local --persist-to ./.wrangler/state`
- 打开控制台提示的本地地址（默认 http://localhost:8788），登录后点击头像测试。

## 部署要求（Pages）
- 确认 Pages 项目开启 Functions，且绑定 Durable Object：
  - 绑定名：`CHAT_ROOM`
  - 类名：`ChatRoom`
- 部署命令示例：`npx wrangler pages deploy . --project-name fog-station --branch main`
