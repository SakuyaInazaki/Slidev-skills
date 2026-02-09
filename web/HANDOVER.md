# Slidev Converter Web - 项目交接文档

> **文档版本**: 1.0
> **最后更新**: 2025-02-09
> **项目状态**: 基础功能完成，支付系统需要重构
> **生产环境**: https://webslidev.vercel.app

---

## 目录

1. [项目概述](#项目概述)
2. [技术栈](#技术栈)
3. [项目结构](#项目结构)
4. [功能清单](#功能清单)
5. [数据库设计](#数据库设计)
6. [API 接口文档](#api-接口文档)
7. [环境配置](#环境配置)
8. [已完成功能](#已完成功能)
9. [未完成/待修复功能](#未完成待修复功能)
10. [开发过程中遇到的问题](#开发过程中遇到的问题)
11. [潜在风险与问题](#潜在风险与问题)
12. [下一步工作建议](#下一步工作建议)
13. [给下一个 Agent 的 Prompt](#给下一个-agent-的-prompt)

---

## 项目概述

### 业务目标

将 Slidev Converter（原本是一个 Claude Skill）转换为 SaaS 网页应用，提供：
- **免费版**: Markdown 转 Slidev 基础功能
- **Pro 版**: AI 辅助优化、AI 图片生成、聊天辅助

### 核心价值主张

1. **中文优化**: 使用 Kimi K2.5 (Moonshot) API，而非 Claude
2. **成本控制**: 转售国内 API，获得折扣定价
3. **灵活支付**: 支持国内支付方式（微信/支付宝）

### 当前状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 用户认证 | ✅ 完成 | GitHub/Google OAuth |
| 核心转换功能 | ✅ 完成 | Markdown → Slidev |
| AI 聊天 | ✅ 完成 | Kimi API 集成 |
| 图片生成 | ✅ 完成 | Zhipu/SiliconFlow/Replicate |
| 订阅管理 | ✅ 完成 | 免费试用 + Pro 订阅 |
| 支付系统 | ⚠️ 需重构 | PayJS 有坑，需要新方案 |

---

## 技术栈

### 前端

```json
{
  "框架": "Next.js 15.5.12 (App Router)",
  "UI": "React 18.3.1",
  "样式": "Tailwind CSS 3.4.17",
  "编辑器": "Monaco Editor 4.6.0",
  "图标": "Lucide React 0.468.0",
  "Markdown": "react-markdown + remark-gfm"
}
```

### 后端

```json
{
  "运行时": "Node.js",
  "认证": "NextAuth.js 5.0.0-beta.30",
  "ORM": "Prisma 5.22.0",
  "数据库": "PostgreSQL (Neon)",
  "支付": "PayJS (需替换)"
}
```

### 部署

```json
{
  "平台": "Vercel",
  "数据库": "Neon PostgreSQL",
  "域名": "webslidev.vercel.app"
}
```

---

## 项目结构

```
web/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/      # NextAuth 认证
│   │   │   ├── kimi/                   # Kimi AI 聊天接口
│   │   │   ├── generate-image/         # AI 图片生成
│   │   │   ├── payment/
│   │   │   │   ├── create-order/       # 创建支付订单
│   │   │   │   ├── manual/             # 手动激活
│   │   │   │   └── webhook/            # 支付回调处理
│   │   │   └── subscription/           # 订阅管理
│   │   ├── globals.css                 # 全局样式
│   │   ├── layout.tsx                  # 根布局
│   │   ├── page.tsx                    # 主页（转换器）
│   │   ├── login/page.tsx              # 登录页
│   │   └── pricing/page.tsx            # 定价页
│   ├── components/
│   │   ├── api-settings.tsx            # API 设置面板
│   │   ├── chat-panel.tsx              # AI 聊天面板
│   │   ├── monaco-editor.tsx           # Monaco 编辑器
│   │   ├── slide-preview.tsx           # 幻灯片预览
│   │   ├── usage-dashboard.tsx         # 使用情况仪表板
│   │   └── ui/                         # shadcn/ui 组件
│   ├── lib/
│   │   ├── converter.ts                # 核心：Markdown → Slidev
│   │   ├── prisma.ts                   # Prisma 客户端
│   │   ├── rate-limit.ts               # 配额检查
│   │   └── utils.ts                    # 工具函数
│   ├── auth.ts                         # NextAuth 配置
│   └── types/
│       ├── next-auth.d.ts              # NextAuth 类型扩展
│       └── index.ts                    # 通用类型
├── prisma/
│   └── schema.prisma                   # 数据库模型
├── .env                                # 环境变量（需要配置）
├── next.config.js                      # Next.js 配置
├── tailwind.config.ts                  # Tailwind 配置
├── package.json                        # 依赖
└── vercel.json                         # Vercel 部署配置
```

---

## 功能清单

### Free 用户功能

| 功能 | 状态 | 文件位置 |
|------|------|----------|
| Markdown 转 Slidev | ✅ | `src/lib/converter.ts` |
| 实时预览 | ✅ | `src/components/slide-preview.tsx` |
| Monaco 编辑器 | ✅ | `src/components/monaco-editor.tsx` |
| 12 种主题选择 | ✅ | `src/lib/converter.ts` (THEMES) |
| 代码高亮 | ✅ | 内置支持 |
| Mermaid 图表 | ✅ | 内置支持 |
| 下载 .md 文件 | ✅ | `src/lib/converter.ts` (downloadSlides) |
| 14 天免费试用 | ✅ | `src/app/api/subscription/route.ts` |

### Pro 用户功能

| 功能 | 状态 | 文件位置 |
|------|------|----------|
| AI 布局优化 | ✅ | `src/app/api/kimi/route.ts` |
| AI 聊天辅助 | ✅ | `src/components/chat-panel.tsx` |
| AI 图片生成 | ✅ | `src/app/api/generate-image/route.ts` |
| 每月 1000万 tokens | ✅ | 配额系统 |
| 每月 1000 张图片 | ✅ | 配额系统 |
| 优先支持 | ⚠️ | 未实现 |

---

## 数据库设计

### 表结构

```prisma
// 用户认证表
User          - 用户基本信息
Account       - OAuth 账户关联
Session       - 用户会话
VerificationToken - 邮箱验证

// 业务表
Subscription  - 订阅信息 (planType, status, 配额)
UsageLog      - 使用记录 (API 调用日志)
PaymentOrder  - 支付订单
```

### Subscription 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| planType | enum | FREE / PRO |
| status | enum | ACTIVE / CANCELED / TRIALING |
| monthlyTokens | int | Pro: 10,000,000 tokens/月 |
| tokensUsed | int | 已使用 tokens |
| imagesAllowed | int | Pro: 1000 张/月 |
| imagesGenerated | int | 已生成图片数 |
| hasAiAccess | bool | 是否有 AI 权限 |
| trialEndsAt | datetime | 试用期结束时间 |
| currentPeriodStart | datetime | 当前计费周期开始 |
| currentPeriodEnd | datetime | 当前计费周期结束 |
| cancelAtPeriodEnd | bool | 是否在周期结束时取消 |

### 枚举类型

```prisma
PlanType: FREE | PRO
SubscriptionStatus: ACTIVE | CANCELED | TRIALING
ApiType: CLAUDE_CHAT | KIMI_CHAT | IMAGE_GENERATION
PaymentMethod: WECHAT | ALIPAY | MANUAL
PaymentStatus: PENDING | PAID | FAILED | REFUNDED
```

---

## API 接口文档

### 认证相关

#### `/api/auth/[...nextauth]`
- **方法**: GET/POST
- **功能**: NextAuth 处理登录/登出
- **Providers**: GitHub, Google

### 核心功能

#### `/api/kimi` - Kimi AI 聊天
```typescript
POST /api/kimi

Request:
{
  messages: Array<{role: "user" | "assistant", content: string}>,
  apiKey?: string,           // 可选，用户自己的 key
  slidevContent?: string,    // 当前幻灯片内容
  originalMarkdown?: string, // 原始 markdown
  model?: "moonshot-v1-8k" | "moonshot-v1-32k" | "moonshot-v1-128k"
}

Response:
{
  response: string,          // AI 回复
  usage: {
    inputTokens: number,
    outputTokens: number,
    totalTokens: number
  }
}
```

#### `/api/generate-image` - AI 图片生成
```typescript
POST /api/generate-image

Request:
{
  provider?: "zhipu" | "replicate" | "siliconflow",
  apiKey?: string,
  prompt: string,
  size?: "1024x1024" | "1024x768" | "768x1024"
}

Response:
{
  imageUrl: string,
  prompt: string
}
```

### 订阅管理

#### `/api/subscription` - 获取/取消订阅
```typescript
GET /api/subscription
// 返回当前订阅信息

POST /api/subscription
// 取消订阅（设置 cancelAtPeriodEnd = true）
```

### 支付系统（需要重构）

#### `/api/payment/create-order` - 创建支付订单
```typescript
POST /api/payment/create-order

Request:
{
  amount: number,
  billingPeriod: "monthly" | "quarterly" | "yearly",
  method: "payjs"   // 当前只支持 payjs
}

Response:
{
  qrcode: string,      // 支付二维码 URL
  outTradeNo: string  // 订单号
}
```

#### `/api/payment/webhook` - 支付回调
```typescript
POST /api/payment/webhook?type=payjs
// PayJS 回调处理

POST /api/payment/webhook?type=manual
// 管理员手动激活
```

#### `/api/payment/manual` - 手动激活
```typescript
POST /api/payment/manual
// 用户提交付款凭证

PUT /api/payment/manual
// 管理员审核 (approve: true/false)

GET /api/payment/manual
// 获取待审核列表（管理员）
```

---

## 环境配置

### `.env` 文件

```bash
# Database
DATABASE_URL="postgres://..."

# NextAuth
NEXTAUTH_URL="https://webslidev.vercel.app"
NEXTAUTH_SECRET="slidev-converter-secret-key-change-in-production"

# OAuth Providers
GITHUB_ID=""          # 需要 GitHub OAuth App
GITHUB_SECRET=""

# Kimi/Moonshot AI (可选 - 用户可自己提供)
MOONSHOT_API_KEY=""

# Image Generation APIs (可选)
ZHIPU_API_KEY=""
SILICONFLOW_API_KEY=""

# Domestic Payment (PayJS) - 需要替换
PAYJS_MCH_ID=""
PAYJS_KEY=""

# Admin email (for manual activation)
ADMIN_EMAIL=""
```

### 配置状态

| 配置项 | 状态 | 说明 |
|--------|------|------|
| DATABASE_URL | ✅ 已配置 | Neon PostgreSQL |
| NEXTAUTH_URL | ✅ 已配置 | Vercel 域名 |
| GITHUB_ID/SECRET | ⚠️ 需要配置 | 需要创建 GitHub OAuth App |
| MOONSHOT_API_KEY | ⚠️ 可选 | 用户可自己提供 |
| PAYJS_MCH_ID/KEY | ❌ 需要替换 | PayJS 有坑，建议换方案 |

---

## 已完成功能

### 1. 用户系统
- [x] GitHub/Google OAuth 登录
- [x] 会话管理（数据库持久化）
- [x] 用户信息存储

### 2. 核心转换功能
- [x] Markdown → Slidev 转换
- [x] 自动检测章节结构
- [x] 智能布局推荐
- [x] 12 种内置主题
- [x] 实时预览
- [x] Monaco 编辑器集成
- [x] 下载 .md 文件

### 3. AI 功能
- [x] Kimi AI 聊天集成
- [x] 支持用户自定义 API key
- [x] 上下文增强（slidevContent + originalMarkdown）
- [x] Token 使用量记录
- [x] 多种图片生成提供商

### 4. 订阅系统
- [x] Free/Pro 订阅类型
- [x] 14 天免费试用
- [x] 配额管理（tokens + images）
- [x] 自动试用期过期处理
- [x] 订阅取消功能

### 5. 支付系统（部分完成）
- [x] PayJS 订单创建
- [x] PayJS 回调处理
- [x] 手动激活流程
- [x] 管理员审核接口
- [x] 支付订单记录

### 6. 用户体验
- [x] 响应式设计
- [x] 深色模式支持
- [x] 使用情况仪表板
- [x] API 设置面板
- [x] 定价页面

---

## 未完成/待修复功能

### 高优先级

#### 1. 支付系统重构 ⚠️
**问题**: PayJS 有以下坑
- 开户费 300 元
- 手续费 2% + 微信 0.38%
- T+1 到账（不是实时）
- 跑路风险
- 封号风险

**需要的方案**:
- [ ] 选择新的支付平台（XorPay、虎皮椒、或其他）
- [ ] 更新 `/api/payment/create-order` 集成新支付
- [ ] 更新 `/api/payment/webhook` 处理新回调
- [ ] 更新 `.env` 配置
- [ ] 测试支付流程

**备选平台**:
| 平台 | 开户费 | 手续费 | 到账时间 |
|------|--------|--------|----------|
| XorPay | 免费 | 0.5% + 0.38% | 微信T1，支付宝实时 |
| 虎皮椒 | 118元 | 未详述 | 自动到账银行卡 |

#### 2. GitHub OAuth 配置 ⚠️
**问题**: `GITHUB_ID` 和 `GITHUB_SECRET` 为空

**需要的步骤**:
1. 去 GitHub 创建 OAuth App
2. 设置 Authorization callback URL: `https://webslidev.vercel.app/api/auth/callback/github`
3. 填入 `.env`

### 中优先级

#### 3. 管理后台界面
**状态**: 只有 API，没有前端界面

**需要实现**:
- [ ] 待审核订单列表页面
- [ ] 用户管理页面
- [ ] 订阅管理页面
- [ ] 财务报表页面

#### 4. 错误处理优化
**问题**:
- 支付失败处理不完善
- 缺少全局错误边界
- API 错误信息不够详细

#### 5. Stripe 代码清理
**问题**: 代码中还残留 Stripe 相关内容
- `@stripe/stripe-js` 依赖
- `stripe` 依赖
- `Subscription` 表中的 `stripeCustomerId` 和 `stripeSubscriptionId` 字段

**建议**: 完全移除或改为可选（如果要支持海外用户）

### 低优先级

#### 6. 性能优化
- [ ] 速率限制改用 Redis（当前是内存 Map）
- [ ] 图片生成添加队列系统
- [ ] 使用量统计添加缓存

#### 7. 代码质量
- [ ] 添加单元测试
- [ ] 添加集成测试
- [ ] 添加 E2E 测试
- [ ] 添加更详细的代码注释

---

## 开发过程中遇到的问题

### 1. Prisma Client 在 Vercel 上未生成

**问题**: 部署时报错 `Prisma Client is not defined`

**解决方案**:
```json
// package.json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

### 2. Stripe 依赖导致构建失败

**问题**: 代码中引用了 Stripe，但环境变量未配置

**解决方案**:
- 删除了 `/src/app/api/checkout` 目录
- 删除了 `/src/app/api/stripe` 目录
- 删除了 `/src/lib/stripe.ts`

### 3. TypeScript Enum 类型错误

**问题**: PaymentMethod 和 PaymentStatus enum 值大小写不匹配

**解决方案**:
```typescript
// 错误
method: "wechat"   // 小写
status: "paid"     // 小写

// 正确
method: "WECHAT"   // 大写
status: "PAID"     // 大写
```

### 4. 数据库表创建

**问题**: Prisma push 在 Vercel 上不工作

**解决方案**: 用户手动在 Neon SQL Editor 中执行 SQL 创建表

---

## 潜在风险与问题

### 安全风险

#### 1. 支付回调签名验证
**当前**: 只使用 MD5 签名
**风险**: MD5 已不安全
**建议**: 升级为 HMAC-SHA256

#### 2. 管理员权限
**当前**: 仅通过 `ADMIN_EMAIL` 环境变量判断
**风险**: 邮箱可以被伪造
**建议**: 添加管理员角色表

#### 3. API 密钥泄露
**当前**: 前端可能暴露 API 密钥
**风险**: 密钥被滥用
**建议**: 后端统一管理密钥，前端不直接访问

### 业务逻辑风险

#### 1. 配额管理
**当前**: 固定配额模式
**问题**: 可能导致资源浪费或滥用
**建议**: 添加更灵活的配额策略

#### 2. 订阅周期计算
**当前**: 简单的 30 天计算
**问题**: 不精确，月份天数不同
**建议**: 使用精确的日期计算

#### 3. 图片生成超时
**当前**: Replicate 轮询最多 60 秒
**问题**: Vercel Serverless 函数有超时限制
**建议**: 改用异步任�� + WebSocket 通知

### 性能风险

#### 1. 速率限制
**当前**: 使用内存 Map 存储
**问题**: 重启后丢失，多实例不同步
**建议**: 使用 Redis 或数据库

#### 2. 数据库查询
**当前**: 使用量统计可能频繁查询
**建议**: 添加缓存层

---

## 下一步工作建议

### 立即行动（本周）

1. **选择并集成新的支付平台**
   - 评估 XorPay、虎皮椒等
   - 更新 API 代码
   - 测试支付流程

2. **配置 GitHub OAuth**
   - 创建 GitHub OAuth App
   - 更新 `.env`

3. **移除不需要的依赖**
   - Stripe 相关依赖
   - 清理数据库字段

### 短期目标（本月）

4. **开发管理后台**
   - 订单管理界面
   - 用户管理界面
   - 财务报表

5. **优化错误处理**
   - 全局错误边界
   - 详细的错误日志
   - 用户友好的错误提示

### 中期目标（3 个月内）

6. **性能优化**
   - Redis 缓存
   - 队列系统
   - 数据库优化

7. **功能增强**
   - 支持更多 AI 服务
   - 团队协作功能
   - 插件系统

---

## 给下一个 Agent 的 Prompt

```markdown
你是接手 Slidev Converter Web 项目的开发者。请按照以下步骤进行工作：

## 第一步：理解项目

1. 阅读 HANDOVER.md 文档，全面了解项目
2. 检查当前代码状态，确认文档的准确性
3. 运行项目，确保基础功能正常

## 第二步：优先处理支付系统重构

这是最高优先级的任务。请执行：

1. **评估支付平台选项**
   - 研究 XorPay（https://xorpay.com）、虎皮椒（https://xp.cn/）等平台
   - 对比费用、到账时间、安全性
   - 向用户汇报推荐方案

2. **集成新的支付平台**
   - 更新 `/api/payment/create-order/route.ts`
   - 更新 `/api/payment/webhook/route.ts`
   - 更新 `.env` 配置
   - 测试完整的支付流程

3. **更新定价页面**
   - 更新 `/pricing/page.tsx` 中的支付流程
   - 确保前端正确调用新的 API

## 第三步：配置 GitHub OAuth

1. 指导用户创建 GitHub OAuth App
2. 更新 `.env` 文件
3. 测试登录功能

## 第四步：清理代码

1. 移除 Stripe 相关代码和依赖
2. 清理数据库中不需要的字段
3. 确保代码整洁

## 第五步：开发管理后台（如果时间允许）

创建 `/admin` 路由下的管理界面：
- 订单审核页面
- 用户管理页面
- 财务统计页面

## 工作原则

1. **保持沟通**：遇到问题及时向用户汇报
2. **测试优先**：每个功能完成后都要测试
3. **文档同步**：代码变更后更新文档
4. **安全第一**：支付相关代码必须仔细检查
5. **中文优先**：使用中文与用户沟通

## 代码提交规范

- 每个功能完成后创建 commit
- Commit message 格式：`feat: 简短描述` 或 `fix: 简短描述`
- 重要功能创建分支开发

现在请开始工作，首先确认你理解了以上内容。
```

---

## 附录

### A. 定价策略

| 周期 | 价格 (CNY) | 价格 (USD) | 折扣 |
|------|-----------|-----------|------|
| 月付 | ¥71 | $9.9 | - |
| 季付 | ¥195 | $27 | 9% off |
| 年付 | ¥640 | $89 | 25% off |

### B. Pro 配额

| 项目 | 数量 |
|------|------|
| Tokens | 10,000,000/月 (约 50万汉字) |
| 图片 | 1,000 张/月 |

### C. 成本分析

| 项目 | 成本 | 说明 |
|------|------|------|
| Kimi API | ¥2/M tokens | moonshot-v1-8k |
| Zhipu 图片 | ¥0.018/张 | CogView-3 |
| 月付成本 | ~¥38 | 20 (tokens) + 18 (images) |
| 月付收入 | ¥71 | 利润 ~¥33 (47%) |

### D. 部署信息

- **Vercel 项目**: slidev-converter-web
- **Git 仓库**: 需要配置
- **域名**: webslidev.vercel.app
- **数据库**: Neon PostgreSQL
- **部署命令**: `vercel --prod`

### E. 联系信息

- **项目所有者**: [需要填写]
- **技术栈**: Next.js + Prisma + PostgreSQL
- **主要语言**: TypeScript

---

**文档结束**

如有疑问，请查阅代码注释或联系项目所有者。
