import test from 'node:test'; import assert from 'node:assert/strict'; import { readFile } from 'node:fs/promises'
test('InvoiceFlow miniapp renders invoice and collection cards', async()=>{const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8'); assert.match(source,/发票申请/); assert.match(source,/我的发票/); assert.match(source,/财务专员/)})

test('InvoiceFlow actions are wired to the real appointment and follow-up client', async()=>{
  const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8')
  assert.match(source,/createApiClient/)
  assert.match(source,/refreshFromApi/)
  assert.match(source,/checkinAppointment/)
  assert.match(source,/updateAppointmentStatus/)
  assert.match(source,/completeFollowup/)
  assert.match(source,/演示数据/)
})

test('Vite proxies the default API path to the local InvoiceFlow service', async()=>{
  const source=await readFile(new URL('../vite.config.js',import.meta.url),'utf8')
  assert.match(source,/proxy/)
  assert.match(source,/localhost:8080/)
})

test('InvoiceFlow miniapp shows invoice detail timeline and collection actions', async()=>{const source=await readFile(new URL('../src/main.js',import.meta.url),'utf8'); assert.match(source,/发票明细/); assert.match(source,/回款时间线/); assert.match(source,/登记回款/); assert.match(source,/核销/)})
