# AI 聊天功能集成说明

## 概述

已成功将 ChatGPT API 集成到 Fog Station 的世界频道中。玩家现在可以在聊天界面与 AI 助手对话，询问游戏相关的问题。

## 功能特性

### 1. 游戏知识库
- 位置：`data/game_knowledge.js`
- 包含完整的游戏文档、机制说明、实验体信息等
- AI 会根据这个知识库回答玩家的问题

### 2. 对话上下文保持
- 系统会保留最近 10 轮对话的上下文
- AI 可以理解连续的多轮对话
- 自动管理历史记录，避免超出 token 限制

### 3. 角色设定
AI 助手被设定为：
- Fog Station 研究设施的 AI 助手
- 友好、专业的对话风格
- 了解所有游戏机制和内容
- 避免直接剧透未体验的内容

## API 配置

当前配置（位于 `pages/subject_monitor.js` 第 117-125 行）：

```javascript
const CHATGPT_CONFIG = {
  apiKey: 'sk-vfCUnN4KpRJpUSJn4mLyUsQcp9y0ozR4Ymc1cHMz19UYaPuU',
  baseURL: 'https://api.lazymicezhu.com',
  model: 'gpt-3.5-turbo',
  maxTokens: 300,
  temperature: 0.7
};
```

### 参数说明
- **apiKey**: API 密钥
- **baseURL**: API 端点地址
- **model**: 使用的模型（**gpt-4.1** - 更强大的推理能力）
- **maxTokens**: 每次回复的最大 token 数（**400**，约 300-350 字）
- **temperature**: 创造性程度（**0.8**，较高创造性，适合角色扮演）

## ⚠️ 重要安全警告

### 当前实现的安全风险

**API 密钥暴露在前端代码中！**

这是一个重大的安全隐患：
1. ✗ 任何人都可以在浏览器查看源代码获取 API 密钥
2. ✗ 恶意用户可能滥用你的 API 密钥
3. ✗ 可能导致意外的高额 API 费用

### 推荐的安全解决方案

#### 方案 1：使用后端代理（推荐）

创建一个简单的后端服务来代理 API 请求：

**示例后端（Node.js + Express）：**

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// API 密钥存储在服务器环境变量中
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('代理服务器运行在端口 3001');
});
```

然后修改前端代码调用后端：

```javascript
// 在 callChatGPT 函数中
const response = await fetch('http://your-backend.com/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'system', content: getSystemPrompt() },
      ...chatHistory
    ]
  })
});
```

#### 方案 2：使用 Serverless 函数

使用 Vercel/Netlify Functions：

**示例（Vercel Functions）：**

```javascript
// api/chat.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  try {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 300,
        temperature: 0.7
      })
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### 方案 3：限制 API 密钥权限

如果暂时无法使用后端，至少应该：
1. 在 API 提供商设置使用限额
2. 限制密钥的使用域名（如果支持）
3. 定期轮换 API 密钥
4. 监控 API 使用情况

## 使用说明

### 玩家如何使用

1. 打开游戏，点击右侧的"频道"标签
2. 在输入框输入问题，按回车或点击"发送"
3. AI 助手会根据游戏知识库回答问题

### 示例对话

**玩家**：游戏怎么玩？
**AI**：欢迎来到 Fog Station！作为实验体监控员，你需要：1) 观察实验体的生命体征 2) 使用采集许可收集数据 3) 用稳定剂控制异化进度。点击左侧的实验体开始监控吧！

**玩家**：什么是异化？
**AI**：异化（SHIFT）是实验体正在经历的神秘转变过程。当异化进度达到 100% 时，实验体会逸散或失控，你将失去监控权限。可以使用稳定剂来降低异化进度。

**玩家**：采集许可怎么补充？
**AI**：采集许可每天早上 6:00（游戏内时间）会自动重置为 10 次。用完后需要等待新的一天开始。

## 代码结构

### 主要文件

1. **data/game_knowledge.js**
   - `GAME_KNOWLEDGE`: 游戏知识库常量
   - `getSystemPrompt()`: 生成系统提示词的函数

2. **pages/subject_monitor.js**
   - 第 8 行：导入 `getSystemPrompt`
   - 第 117-125 行：API 配置
   - 第 128 行：对话历史记录
   - 第 831-879 行：`callChatGPT()` - API 调用函数
   - 第 884-926 行：`sendChatMessage()` - 发送消息函数

### 函数说明

#### `callChatGPT(userMessage)`
调用 ChatGPT API 获取回复

**参数**：
- `userMessage`: 用户输入的消息

**返回**：
- AI 的回复文本

**功能**：
- 管理对话历史（最多保留 10 轮）
- 构建 API 请求
- 处理响应和错误

#### `sendChatMessage()`
处理用户发送消息的主函数

**功能**：
- 显示用户消息
- 调用 `callChatGPT()` 获取 AI 回复
- 显示 AI 回复
- 更新聊天状态
- 错误处理

## 测试建议

### 功能测试
1. ✓ 发送简单问题（如"游戏怎么玩？"）
2. ✓ 测试连续对话（多轮对话保持上下文）
3. ✓ 测试游戏机制相关问题
4. ✓ 测试实验体信息查询
5. ✓ 测试错误处理（断网、API 错误等）

### 性能测试
1. 检查响应时间（应在 2-5 秒内）
2. 检查 token 使用量
3. 监控 API 调用成本

### 用户体验测试
1. 输入法兼容性（已修复）
2. 长文本处理
3. 状态显示是否准确
4. 错误信息是否友好

## 故障排查

### 常见问题

**问题 1：显示"API请求失败: 401"**
- 原因：API 密钥无效或过期
- 解决：检查 CHATGPT_CONFIG.apiKey 是否正确

**问题 2：显示"API请求失败: 429"**
- 原因：API 请求频率限制
- 解决：等待一段时间后重试，或升级 API 计划

**问题 3：回复很慢**
- 原因：网络延迟或 API 负载高
- 解决：检查网络连接，考虑使用更快的模型

**问题 4：AI 回复不准确**
- 原因：知识库信息不足或过时
- 解决：更新 `data/game_knowledge.js` 中的内容

**问题 5：CORS 错误**
- 原因：API 端点不支持跨域请求
- 解决：使用后端代理或配置 CORS

## 未来改进建议

1. **添加消息速率限制**：防止用户过度调用 API
2. **添加加载动画**：改善等待体验
3. **支持多语言**：国际化支持
4. **添加预设问题**：快速访问常见问题
5. **离线缓存**：缓存常见问题的答案
6. **对话历史持久化**：保存到 localStorage
7. **实现后端代理**：解决安全问题（最重要）

## 维护清单

### 定期检查
- [ ] 监控 API 使用量和成本
- [ ] 更新游戏知识库（当游戏内容更新时）
- [ ] 检查 API 密钥是否仍然有效
- [ ] 审查用户反馈，优化 AI 回复质量

### 安全检查
- [ ] 确认 API 密钥未被滥用
- [ ] 实施后端代理（强烈推荐）
- [ ] 设置 API 使用限额
- [ ] 定期轮换 API 密钥

## 许可和使用条款

使用 ChatGPT API 需遵守 OpenAI 的使用条款：
- 不得用于非法或有害目的
- 需要遵守速率限制
- API 使用产生的费用由你承担

---

## 🎨 最新更新 (v2.0.0)

### Markdown 渲染支持 ✨
聊天界面现已完全支持 Markdown 格式化！

**支持的格式**：
- **粗体**：`**文本**` → 带蓝色光晕效果
- *斜体*：`*文本*` → 青色斜体
- `代码`：`` `代码` `` → 等宽字体，深色背景
- 数字列表：`1. 项目` → 青色数字标记
- 换行：自动处理

**实现位置**：
- `pages/subject_monitor.js` 第 803-831 行：`renderMarkdown()` 函数
- `index.css` 第 1270-1305 行：Markdown 样式

### AI 角色升级 🎭

**模型升级**：
- 从 `gpt-3.5-turbo` 升级到 **`gpt-4.1`**
- `maxTokens`: 300 → **400**
- `temperature`: 0.7 → **0.8**（更好的角色扮演）

**角色设定**：
- **新身份**: BNU 研究设施神经同步系统 v3.2（代号 NEURO-SYNC）
- **新名称**: 从"AI助手"改为 **"NEURO-SYNC"**
- **对话风格**: 专业术语 + 科幻氛围，称呼玩家为"研究员"
- **状态显示**: "在线" → "同步中"

**系统提示词优化**：
- 更详细的角色背景设定
- 对话风格示例（好的 vs 不好的）
- 紧急协议和特殊情况处理
- 更强的沉浸感和世界观一致性

**欢迎消息**：
- 首次打开聊天时显示欢迎消息
- 介绍 NEURO-SYNC 身份和功能
- 使用 Markdown 格式化
- 仅显示一次（localStorage 记录）

**示例对话**：
```
研究员: 异化是什么？
NEURO-SYNC: 异化（SHIFT）是实验体正在经历的未知转变。
            当指数达到 100%，个体将**逸散**至不可观测维度。
            建议使用稳定剂控制进程。
```

---

**最后更新**: 2025-12-21
**版本**: 2.0.0
**作者**: Claude Code

**更新日志**:
- v2.0.0 (2025-12-21): Markdown 渲染 + AI 角色升级 + gpt-4.1
- v1.0.0 (2025-12-21): 初始版本，基础 ChatGPT 集成
