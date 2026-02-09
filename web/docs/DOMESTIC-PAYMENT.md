# 国内支付平台集成指南

由于您只有国内银行卡，无法使用 Stripe，以下是几个可选的国内支付平台方案：

## 推荐方案

### 1. 码支付 (PayJS)

**特点**:
- 支持微信支付、支付宝
- 个人开发者友好
- 费用相对较低（约 2%）

**接入步骤**:
1. 注册账号: https://payjs.cn/
2. 获取 PID 和 Key
3. 创建支付接口

**示例代码**:
```typescript
// /api/payment/create-payjs-order.ts
async function createPayJSOrder(amount: number, userId: string) {
  const response = await fetch("https://payjs.cn/api/native", {
    method: "POST",
    body: JSON.stringify({
      mchid: process.env.PAYJS_MCH_ID,
      total_fee: amount * 100, // 单位：分
      out_trade_no: `order_${Date.now()}_${userId}`,
      body: "Slidev Pro 会员",
      notify_url: `${process.env.NEXTAUTH_URL}/api/payment/payjs/callback`,
      sign: generateSign(...),
    }),
  })
  return response.json()
}
```

**环境变量**:
```bash
PAYJS_MCH_ID="your-payjs-mch-id"
PAYJS_KEY="your-payjs-key"
```

### 2. 易支付/虎皮椒

**特点**:
- 支持微信、支付宝、QQ钱包
- 有完善的 API 文档
- 支持个人/企业

**接入步骤**:
1. 注册: https://www.xunhupay.com/ 或 https://api.huobi.io/
2. 获取 API 凭证
3. 配置回调地址

### 3. Stripe 国内间接方案

如果您能找到朋友帮忙：
- 让有海外银行卡的朋友注册 Stripe 账号
- 您作为合作者接入
- 收益通过其他方式结算

## 简化方案：手动激活

对于初期项目，可以采用**手动激活**的方式：

1. 用户提交付款凭证（截图）
2. 管理员在后台审核
3. 手动激活 Pro 会员

```typescript
// /api/payment/manual-verify.ts
export async function POST(req: NextRequest) {
  const { userId, proofImage } = await req.json()
  // 1. 保存凭证到数据库
  // 2. 通知管理员审核
  // 3. 管理员审核通过后更新 subscription 表
}
```

## 数据库修改

需要添加支付订单表：

```prisma
// prisma/schema.prisma
model PaymentOrder {
  id          String   @id @default(cuid())
  userId      String
  amount      Decimal  @db.Decimal(10, 2)
  method      String   // "wechat", "alipay", "manual"
  status      String   @default("pending") // "pending", "paid", "failed"
  transaction String?  // 第三方交易号
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id])
}

model User {
  // ... 现有字段
  paymentOrders PaymentOrder[]
}
```

## 最小可行方案

如果您只是想快速测试：

1. 使用码支付（推荐个人开发者）
2. 或暂时使用手动激活 + 微信/支付宝转账

需要我帮您实现具体的支付接口吗？
