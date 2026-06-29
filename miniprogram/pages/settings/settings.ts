// settings.ts — 设置页
import { getDeviceId, setDeviceId, setMode, setThreshold, getHistory } from '../../utils/api'

Component({
  data: {
    did: 'gh01',
    mode: 'auto',
    th: { TH_TEMP: 35, TH_HUMI: 40, TH_LUX: 2000, TH_WATER: 30 } as Record<string, number>,
  },

  lifetimes: {
    attached() {
      this.setData({ did: getDeviceId() })
      const saved = wx.getStorageSync('thresholds')
      if (saved) this.setData({ th: saved })
      this.loadMode()
    }
  },

  methods: {
    async loadMode() {
      try {
        const h = await getHistory()
        if (h && h.length && h[h.length - 1].mode) this.setData({ mode: h[h.length - 1].mode })
      } catch {}
    },

    onDidInput(e: any) { this.setData({ did: e.detail.value }) },

    // 阈值 +/-
    onTh(e: any) {
      const k = e.currentTarget.dataset.k
      const d = +e.currentTarget.dataset.d
      const v = Math.max(0, this.data.th[k] + d)
      this.setData({ [`th.${k}`]: v })
    },

    // 保存
    async onSave() {
      setDeviceId(this.data.did)
      wx.setStorageSync('thresholds', this.data.th)

      wx.showLoading({ title: '下发…' })
      try {
        for (const [k, v] of Object.entries(this.data.th)) {
          await setThreshold(k, v)
        }
        wx.hideLoading()
        wx.showToast({ title: '已保存', icon: 'success' })
      } catch {
        wx.hideLoading()
        wx.showToast({ title: '部分失败', icon: 'none' })
      }
    },

    // 模式
    async onMode(e: any) {
      const m = e.currentTarget.dataset.m
      wx.showLoading({ title: '切换…' })
      try {
        await setMode(m)
        this.setData({ mode: m })
        wx.hideLoading()
        wx.showToast({ title: m === 'auto' ? '自动' : '手动', icon: 'success' })
      } catch { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }) }
    },

    // 测试连接
    async onTest() {
      wx.showLoading({ title: '测试…' })
      try {
        const t0 = Date.now()
        await getHistory()
        const ms = Date.now() - t0
        wx.hideLoading()
        wx.showModal({ title: '连接正常', content: `延迟 ${ms}ms\n123.207.45.73:8111`, showCancel: false })
      } catch {
        wx.hideLoading()
        wx.showModal({ title: '连接失败', content: '检查服务器或网络', showCancel: false })
      }
    },

    onClear() {
      wx.showModal({
        title: '清除缓存？', content: '会重置设备ID和阈值',
        success: (r) => {
          if (!r.confirm) return
          wx.clearStorageSync()
          this.setData({ did: 'gh01', th: { TH_TEMP: 35, TH_HUMI: 40, TH_LUX: 2000, TH_WATER: 30 } })
          setDeviceId('gh01')
          wx.showToast({ title: '已清除', icon: 'success' })
        }
      })
    },

    onAbout() {
      wx.showModal({
        title: '智能温室种植系统',
        content: 'MQTT + HTTP + 小程序\n温湿度/光照/水位/空气\n水泵/补光/风扇\nMaixCAM 病虫害识别\n\n123.207.45.73:8111',
        showCancel: false,
      })
    },
  }
})
