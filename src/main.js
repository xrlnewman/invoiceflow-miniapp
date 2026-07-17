import './styles.css'

import { createApiClient } from './api.js'

const api = createApiClient()

const demoAppointments = [
  { id: 'INV-0716-082', patientId: 'CUS-001', patient: '杭州星河科技', department: '增值税专票', doctor: '林然 · 财务专员', scheduledAt: '今天 09:30', status: '待确认' },
  { id: 'INV-0716-079', patientId: 'CUS-001', patient: '杭州星河科技', department: '电子普票', doctor: '沈宁 · 结算专员', scheduledAt: '今天 14:00', status: '候诊中' },
  { id: 'INV-0715-031', patientId: 'CUS-001', patient: '上海岸线设计', department: '服务费发票', doctor: '赵然 · 财务专员', scheduledAt: '07/23 10:30', status: '已完成' },
]

const demoFollowups = [
  { id: 'TASK-0716-014', patientId: 'CUS-001', patient: '杭州星河科技', summary: '核对销项税额与开票信息', dueAt: '今天 18:00', status: '待完成' },
  { id: 'TASK-0715-006', patientId: 'CUS-001', patient: '苏州云杉供应链', summary: '跟进客户回款凭证', dueAt: '明天 10:00', status: '待完成' },
]

const demoInvoices = [{ id: 'INV-202607-082', customerName: '杭州星河科技', amountCents: 128000, paidCents: 64000, status: '部分回款', dueDate: '07/20', events: [{ toStatus: '已开具', actor: '林然', createdAt: '今天 09:10' }, { toStatus: '部分回款', actor: '客户', createdAt: '今天 11:30' }] }, { id: 'INV-202607-079', customerName: '苏州云杉供应链', amountCents: 86000, paidCents: 0, status: '已开具', dueDate: '07/25', events: [{ toStatus: '已开具', actor: '沈宁', createdAt: '昨天 16:00' }] }]

let appointments = [...demoAppointments]
let followups = [...demoFollowups]
let invoices = demoInvoices.map((item) => ({ ...item }))
let selectedInvoice = null
let dataSource = '演示数据'
const busyActions = new Set()

const app = document.querySelector('#app')

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function statusClass(status) {
  if (status === '已完成') return 'green'
  if (status === '候诊中' || status === '处理中') return 'indigo'
  if (status === '已确认') return 'blue'
  if (status === '已取消') return 'muted'
  return 'coral'
}

const statusLabels = { 待确认: '待开票', 已确认: '已开票', 候诊中: '待回款', 处理中: '对账中', 已完成: '已归档', 已取消: '已作废' }

function displayTime(value) {
  const text = String(value ?? '')
  if (!text.includes('T')) return text
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) return text
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function appointmentAction(status) {
  switch (status) {
    case '待确认': return { action: 'checkin', label: '立即确认' }
    case '已确认': return { action: 'waiting', label: '进入回款队列' }
    case '候诊中': return { action: 'serving', label: '开始对账' }
    case '处理中': return { action: 'complete-appointment', label: '完成处理' }
    default: return null
  }
}

function renderAppointment(appointment) {
  const action = appointmentAction(appointment.status)
  const actionButton = action
    ? `<button class="visit-action" data-action="${action.action}" data-id="${escapeHtml(appointment.id)}">${action.label}　→</button>`
    : `<span class="visit-note">${appointment.status === '已完成' ? '服务已完成' : '发票已取消'}</span>`

  return `<article class="visit">
    <div class="visit-top"><span class="tag ${statusClass(appointment.status)}">${escapeHtml(statusLabels[appointment.status] || appointment.status)}</span><span>${escapeHtml(displayTime(appointment.scheduledAt))}</span></div>
    <h4>${escapeHtml(appointment.department)}</h4>
    <p>${escapeHtml(appointment.doctor)} · 上海静安联合财务中心</p>
    ${actionButton}
  </article>`
}

function renderFollowup(followup) {
  const completed = followup.status === '已完成'
  return `<article class="reminder ${completed ? 'done' : 'warm'}">
    <span>${completed ? '✓' : '!'}</span>
    <div><strong>${escapeHtml(followup.summary)}</strong><p>${escapeHtml(followup.dueAt)} · ${completed ? '已完成' : '待完成'}</p></div>
    ${completed ? '<b class="done-mark">已完成</b>' : `<button data-action="complete-followup" data-id="${escapeHtml(followup.id)}">完成</button>`}
  </article>`
}

function invoiceMoney(cents) { return `¥${(Number(cents || 0) / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}` }
function renderInvoiceCard(invoice) {
  return `<article class="invoice-card"><div><strong>${escapeHtml(invoice.id)}</strong><p>${escapeHtml(invoice.customerName)} · 应收 ${invoiceMoney(invoice.amountCents)}</p></div><span class="tag ${statusClass(invoice.status)}">${escapeHtml(invoice.status)}</span><button data-action="open-invoice" data-id="${escapeHtml(invoice.id)}">发票明细　→</button></article>`
}
function renderInvoiceDetail() {
  if (!selectedInvoice) return '<div class="empty">选择一张发票查看详情、回款时间线和核销操作</div>'
  return `<article class="invoice-detail"><div class="section-head"><h3>发票明细</h3><span class="tag ${statusClass(selectedInvoice.status)}">${escapeHtml(selectedInvoice.status)}</span></div><p>${escapeHtml(selectedInvoice.customerName)} · ${escapeHtml(selectedInvoice.id)}</p><div class="invoice-summary"><strong>应收 ${invoiceMoney(selectedInvoice.amountCents)}</strong><span>已回款 ${invoiceMoney(selectedInvoice.paidCents)}</span></div><div class="invoice-actions"><button class="visit-action" data-action="invoice-payment" data-id="${escapeHtml(selectedInvoice.id)}">登记回款</button><button class="visit-action" data-action="invoice-reconcile" data-id="${escapeHtml(selectedInvoice.id)}">核销</button></div><h4>回款时间线</h4><div class="invoice-timeline">${(selectedInvoice.events || []).map((event) => `<p><b>${escapeHtml(event.toStatus || event.type)}</b><small>${escapeHtml(event.actor || '系统')} · ${escapeHtml(event.createdAt || '--')}</small></p>`).join('')}</div></article>`
}

function render() {
  app.innerHTML = `<main class="app">
    <header>
      <div><p>INVOICEFLOW / 2026</p><h1>让每张发票<br><b>都能及时回款</b></h1></div>
      <div class="header-side"><span class="source-badge">${dataSource}</span><span class="avatar">许</span></div>
    </header>
    <section class="hero"><span>发票工作台</span><h2>今天也要按时收款</h2><p>开票 · 对账 · 回款<br>每一步都有清晰提醒</p><div class="sun">¥</div></section>
    <section class="quick">
      <button data-action="create-appointment"><b>＋</b><span>发票申请</span></button>
      <button data-action="refresh"><b>◷</b><span>刷新回款</span></button>
      <button data-action="create-followup"><b>✓</b><span>新建跟进</span></button>
    </section>
    <div class="section-head"><h3>我的发票 <small>${appointments.length} 条</small></h3><a data-action="refresh">同步 →</a></div>
    <section class="visits">${appointments.length ? appointments.map(renderAppointment).join('') : '<div class="empty">暂时没有发票，点击上方发票申请创建一条</div>'}</section>
    <div class="section-head"><h3>收款工作台 <small>${invoices.length} 张</small></h3><a data-action="refresh">同步 →</a></div>
    <section class="invoice-list">${invoices.map(renderInvoiceCard).join('')}</section>
    <section class="invoice-detail-wrap">${renderInvoiceDetail()}</section>
    <div class="section-head"><h3>跟进任务 <small class="coral">${followups.filter((item) => item.status !== '已完成').length} 条待办</small></h3><a data-action="refresh">查看 →</a></div>
    <section class="reminders">${followups.length ? followups.slice(0, 3).map(renderFollowup).join('') : '<div class="empty">暂无跟进任务</div>'}</section>
    <nav><button class="active">⌂<small>首页</small></button><button data-action="create-appointment">＋<small>发票</small></button><button data-action="refresh">◷<small>回款</small></button><button data-action="create-followup">✓<small>跟进</small></button></nav>
    <div class="toast" hidden></div>
  </main>`
  bindActions()
}

function showToast(message) {
  const toast = document.querySelector('.toast')
  if (!toast) return
  toast.textContent = message
  toast.hidden = false
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => { toast.hidden = true }, 2200)
}

function updateAppointment(id, updater) {
  appointments = appointments.map((item) => item.id === id ? updater(item) : item)
}

function updateFollowup(id, updater) {
  followups = followups.map((item) => item.id === id ? updater(item) : item)
}

function localAppointment() {
  return {
    id: `INV-DEMO-${Date.now().toString().slice(-6)}`,
    patientId: 'CUS-001', patient: '杭州星河科技', department: '增值税专票', doctor: '林然 · 财务专员',
    scheduledAt: '明天 09:30', status: '待确认',
  }
}

function localFollowup() {
  return {
    id: `TASK-DEMO-${Date.now().toString().slice(-6)}`,
    patientId: 'CUS-001', patient: '杭州星河科技', summary: '核对本次发票与回款凭证', dueAt: '明天 18:00', status: '待完成',
  }
}

async function refreshFromApi() {
  const results = await Promise.allSettled([
    api.listAppointments({ page: 1, pageSize: 20 }),
    api.listFollowups({ page: 1, pageSize: 20 }),
    api.listInvoices({ page: 1, pageSize: 20 }),
  ])
  let synced = 0
  const appointmentsResult = results[0]
  if (appointmentsResult.status === 'fulfilled' && Array.isArray(appointmentsResult.value?.list)) {
    appointments = appointmentsResult.value.list
    synced += 1
  }
  const followupsResult = results[1]
  if (followupsResult.status === 'fulfilled' && Array.isArray(followupsResult.value?.list)) {
    followups = followupsResult.value.list
    synced += 1
  }
  const invoicesResult = results[2]
  if (invoicesResult.status === 'fulfilled' && Array.isArray(invoicesResult.value?.list)) {
    invoices = invoicesResult.value.list
    synced += 1
  }
  dataSource = synced ? '接口数据' : '演示数据'
  render()
  showToast(synced ? '已同步最新发票与跟进' : '服务暂不可用，继续使用演示数据')
}

async function createAppointment() {
  const input = {
    patientId: 'CUS-001', patient: '杭州星河科技', department: '增值税专票', doctor: '林然 · 财务专员',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
  try {
    const created = await api.createAppointment(input)
    appointments = [created, ...appointments]
    dataSource = '接口数据'
    render()
    showToast('发票已提交，等待财务中心确认')
  } catch {
    appointments = [localAppointment(), ...appointments]
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已保留演示发票')
  }
}

async function createFollowup() {
  const input = { patientId: 'CUS-001', patient: '杭州星河科技', summary: '核对本次发票与回款凭证', dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() }
  try {
    const created = await api.createFollowup(input)
    followups = [created, ...followups]
    dataSource = '接口数据'
    render()
    showToast('跟进任务已创建')
  } catch {
    followups = [localFollowup(), ...followups]
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已保留演示跟进')
  }
}

async function transitionAppointment(id, action) {
  const current = appointments.find((item) => item.id === id)
  if (!current) return
  const statusByAction = { waiting: '候诊中', serving: '处理中', 'complete-appointment': '已完成' }
  try {
    const updated = action === 'checkin'
      ? await api.checkinAppointment(id)
      : await api.updateAppointmentStatus(id, statusByAction[action], '客户端')
    updateAppointment(id, () => updated)
    dataSource = '接口数据'
    render()
    showToast(action === 'checkin' ? '确认成功，已进入开票队列' : `状态已更新为${statusLabels[updated.status] || updated.status}`)
  } catch {
    const fallbackStatus = action === 'checkin' ? '已确认' : statusByAction[action]
    updateAppointment(id, (item) => ({ ...item, status: fallbackStatus }))
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已在演示数据中推进')
  }
}

async function completeFollowup(id) {
  try {
    const updated = await api.completeFollowup(id)
    updateFollowup(id, () => updated)
    dataSource = '接口数据'
    render()
    showToast('跟进已完成，回款状态已更新')
  } catch {
    updateFollowup(id, (item) => ({ ...item, status: '已完成' }))
    dataSource = '演示数据'
    render()
    showToast('接口暂不可用，已在演示数据中标记完成')
  }
}

async function openInvoice(id) {
  try { selectedInvoice = await api.getInvoice(id); dataSource = '接口数据' } catch { selectedInvoice = invoices.find((item) => item.id === id) || null; dataSource = '演示数据'; showToast('详情接口暂不可用，展示演示数据') }
  render()
}

async function invoicePayment(id) {
  const invoice = invoices.find((item) => item.id === id) || selectedInvoice
  if (!invoice) return
  try { await api.addInvoicePayment(id, { amountCents: Math.max(1, Number(invoice.amountCents || 0) - Number(invoice.paidCents || 0)), method: '银行转账', reference: `MINI-${id}` }); selectedInvoice = await api.getInvoice(id); invoices = invoices.map((item) => item.id === id ? selectedInvoice : item); dataSource = '接口数据'; render(); showToast('回款已登记') } catch { showToast('登记回款失败，请稍后重试') }
}

async function invoiceReconcile(id) {
  try { await api.reconcileInvoice(id, '客户'); selectedInvoice = await api.getInvoice(id); invoices = invoices.map((item) => item.id === id ? selectedInvoice : item); dataSource = '接口数据'; render(); showToast('发票已核销') } catch { showToast('核销失败，请先确认回款已到账') }
}

async function handleAction(action, id) {
  const key = `${action}:${id ?? ''}`
  if (busyActions.has(key)) return
  busyActions.add(key)
  const button = [...document.querySelectorAll('[data-action]')].find((item) => item.dataset.action === action && (id === undefined || item.dataset.id === id))
  if (button) { button.disabled = true; button.dataset.busy = 'true'; button.textContent = '处理中…' }
  try {
    if (action === 'refresh') await refreshFromApi()
    if (action === 'create-appointment') await createAppointment()
    if (action === 'create-followup') await createFollowup()
    if (['checkin', 'waiting', 'serving', 'complete-appointment'].includes(action)) await transitionAppointment(id, action)
    if (action === 'complete-followup') await completeFollowup(id)
    if (action === 'open-invoice') await openInvoice(id)
    if (action === 'invoice-payment') await invoicePayment(id)
    if (action === 'invoice-reconcile') await invoiceReconcile(id)
  } finally {
    busyActions.delete(key)
  }
}

function bindActions() {
  document.querySelectorAll('[data-action]').forEach((element) => {
    element.addEventListener('click', () => handleAction(element.dataset.action, element.dataset.id))
  })
}

render()
void refreshFromApi()
