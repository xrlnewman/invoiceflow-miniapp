import test from 'node:test'
import assert from 'node:assert/strict'

import { createApiClient } from '../src/api.js'

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return { code: 0, message: 'ok', data }
    },
  }
}

test('默认请求 /api/v1 并为发票写操作注入幂等键', async () => {
  const requests = []
  const client = createApiClient({
    fetchImpl: async (url, init) => {
      requests.push({ url, init })
      return response({ id: 'AP-0716-082', status: '待确认' })
    },
  })

  const appointment = await client.createAppointment({
    patientId: 'PT-001',
    patient: '许汝林',
    department: '全科门诊',
    doctor: '林负责人',
    scheduledAt: '2026-07-17T09:30:00+08:00',
  })

  assert.equal(appointment.id, 'AP-0716-082')
  assert.equal(requests[0].url, '/api/v1/appointments')
  assert.equal(requests[0].init.method, 'POST')
  assert.match(requests[0].init.headers['Idempotency-Key'], /^cf-/)
  assert.equal(requests[0].init.headers['Content-Type'], 'application/json')
})

test('列表请求保留查询参数，配置了完整 API 地址时不重复拼接路径', async () => {
  const urls = []
  const client = createApiClient({
    baseUrl: 'http://localhost:8088/api/v1/',
    fetchImpl: async (url) => {
      urls.push(url)
      return response({ list: [], total: 0, page: 1, pageSize: 20 })
    },
  })

  await client.listAppointments({ page: 1, pageSize: 20, status: '候诊中' })
  await client.listFollowups({ page: 1, pageSize: 10, status: '待完成' })

  assert.deepEqual(urls, [
    'http://localhost:8088/api/v1/appointments?page=1&pageSize=20&status=%E5%80%99%E8%AF%8A%E4%B8%AD',
    'http://localhost:8088/api/v1/followups?page=1&pageSize=10&status=%E5%BE%85%E5%AE%8C%E6%88%90',
  ])
})

test('发票生命周期和回访完成操作走后端契约', async () => {
  const calls = []
  const client = createApiClient({
    fetchImpl: async (url, init) => {
      calls.push({ url, init })
      return response({ id: 'ok' })
    },
  })

  await client.checkinAppointment('AP-1')
  await client.updateAppointmentStatus('AP-1', '候诊中')
  await client.updateAppointmentStatus('AP-1', '处理中')
  await client.updateAppointmentStatus('AP-1', '已完成')
  await client.completeFollowup('FW-1')

  assert.deepEqual(calls.map(({ url }) => url), [
    '/api/v1/appointments/AP-1/checkin',
    '/api/v1/appointments/AP-1/status',
    '/api/v1/appointments/AP-1/status',
    '/api/v1/appointments/AP-1/status',
    '/api/v1/followups/FW-1/complete',
  ])
  for (const { init } of calls) {
    assert.match(init.headers['Idempotency-Key'], /^cf-/)
  }
})

test('非零响应会抛错，调用方可以保留演示数据', async () => {
  const client = createApiClient({
    fetchImpl: async () => ({
      ok: false,
      status: 409,
      async json() {
        return { code: 409, message: '状态不可推进', data: null }
      },
    }),
  })

  await assert.rejects(() => client.updateAppointmentStatus('AP-1', '候诊中'), /状态不可推进/)
})

test('发票详情、登记回款和核销走后端闭环契约', async () => {
  const urls = []
  const client = createApiClient({ fetchImpl: async (url) => { urls.push(url); return response({ id: 'INV-1', status: '已开具' }) } })
  await client.listInvoices({ page: 1, pageSize: 10 })
  await client.getInvoice('INV-1')
  await client.createInvoice({ customerName: '星河科技', amountCents: 1000 })
  await client.addInvoicePayment('INV-1', { amountCents: 1000, method: '银行转账' })
  await client.reconcileInvoice('INV-1')
  assert.deepEqual(urls, ['/api/v1/invoices?page=1&pageSize=10', '/api/v1/invoices/INV-1', '/api/v1/invoices', '/api/v1/invoices/INV-1/payments', '/api/v1/invoices/INV-1/reconcile'])
})
