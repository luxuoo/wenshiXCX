// api.ts — 后端接口封装
// 服务器: 123.207.45.73:8111  开发用HTTP，上线改HTTPS
const BASE = 'http://123.207.45.73:8111'

export function getDeviceId(): string {
  return wx.getStorageSync('device_id') || 'gh01'
}
export function setDeviceId(id: string) {
  wx.setStorageSync('device_id', id)
}

// 通用请求
function req<T>(url: string, opt: any = {}): Promise<T> {
  return new Promise((ok, fail) => {
    wx.request({
      url: BASE + url,
      header: { 'Content-Type': 'application/json' },
      ...opt,
      success: (r) => r.statusCode >= 200 && r.statusCode < 300 ? ok(r.data as T) : fail(new Error('HTTP ' + r.statusCode)),
      fail,
    })
  })
}

// ---- 遥测 ----
export interface TeleData {
  id: number; device_id: string; ts: number
  temp: number; humi: number; lux: number; water: number; air: number
  pump: number; light: number; fan: number
  relay?: { pump: number; light: number; fan: number }
  mode?: string; nodes?: { n1: number; n2: number }
  vision?: { cls: string; conf: number; pest: number }
}

export function getHistory(did?: string): Promise<TeleData[]> {
  return req(`/api/history?device_id=${did || getDeviceId()}`)
}

// ---- 控制 ----
export interface CmdRes {
  cmd_id: string; status: 'acked' | 'sent'
  ack?: { cmd_id: string; ok: boolean; relay?: any }
}

export function sendCmd(body: any, did?: string): Promise<CmdRes> {
  return req('/api/cmd', { method: 'POST', data: { device_id: did || getDeviceId(), ...body } })
}

export function toggleRelay(r: 'pump' | 'light' | 'fan', v: 0 | 1) {
  return sendCmd({ set: { [r]: v } })
}
export function setMode(m: 'auto' | 'manual') {
  return sendCmd({ mode: m })
}
export function setThreshold(k: string, v: number) {
  return sendCmd({ set: { [k]: v } })
}
export function triggerSnap() {
  return sendCmd({ set: { snap: 1 } })
}

// ---- 视觉 ----
export interface VisionRecord {
  id: number; device_id: string; ts: number
  url: string; cls: string; conf: number; pest: number
}

export function getVisionLatest(did?: string): Promise<VisionRecord[]> {
  return req(`/api/vision/latest?device_id=${did || getDeviceId()}`)
}

// ---- 工具 ----
export function formatTs(ts: number): string {
  const d = new Date(ts * 1000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

export function formatTimeShort(ts: number): string {
  const d = new Date(ts * 1000)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export function clsToText(cls: string): string {
  const m: Record<string, string> = {
    healthy: '健康', leaf_spot: '叶斑病', aphid: '蚜虫',
    powdery_mildew: '白粉病', rust: '锈病', bacterial_spot: '斑点病',
  }
  return m[cls] || cls
}
