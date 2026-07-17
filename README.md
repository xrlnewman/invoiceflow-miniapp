# InvoiceFlow Miniapp

免费开源的发票收款运营移动端，覆盖发票申请、确认、候诊、处理状态、业务档案和复诊任务。演示数据均为虚构，不涉及诊断、处方、支付或真实客户隐私。

## 本地运行

```bash
npm install
npm run dev
```

开发服务器默认把 `/api/*` 代理到 `http://localhost:8080`，与同目录的 `invoiceflow-admin/server` 默认端口一致。也可以通过环境变量修改：

```bash
VITE_API_PROXY_TARGET=http://localhost:8088 npm run dev
```

## API 闭环

页面默认请求 `/api/v1`，生产环境可通过 `VITE_API_BASE_URL` 指向独立的 InvoiceFlow API 服务。所有写操作会自动生成 `Idempotency-Key`，避免重复发票、重复确认和重复完成回访。

- 发票：`GET/POST /api/v1/appointments`
- 确认：`POST /api/v1/appointments/:id/checkin`
- 状态流转：`POST /api/v1/appointments/:id/status`，支持“已确认→候诊中→处理中→已完成”
- 回访：`GET/POST /api/v1/followups`、`POST /api/v1/followups/:id/complete`

接口不可用或返回错误时，移动端会保留并继续展示内置演示数据，同时标记当前数据来源，方便离线预览。

## 验证

```bash
npm test
npm run build
```

## 产品边界

InvoiceFlow 移动端是免费开源的 发票收款体验端，与对应 Admin/API 通过同一套幂等接口联动。

