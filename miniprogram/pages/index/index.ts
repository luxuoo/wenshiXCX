// index.ts — 主页：实时数据 + 控制
import { getHistory, getVisionLatest, toggleRelay, setMode, triggerSnap, formatTimeShort, clsToText, getDeviceId, formatTs } from '../../utils/api'

Component({
  data: {
    deviceId: 'gh01',
    online: true,
    lastUpdate: '--',
    latest: {} as any,
    relay: { pump: 0, light: 0, fan: 0 },
    mode: 'auto',
    vision: null as any,
    refreshing: false,
    tempPct: 0, humiPct: 0, luxPct: 0, waterPct: 0,
    luxTxt: '--',
  },

  lifetimes: {
    attached() {
      this.setData({ deviceId: getDeviceId() })
      this.fetch()
      this._t = setInterval(() => this.fetch(), 15000)
    },
    detached() { clearInterval(this._t) }
  },

  methods: {
    async fetch() {
      try {
        const [hist, vis] = await Promise.all([
          getHistory(),
          getVisionLatest().catch(() => [])
        ])

        if (hist && hist.length) {
          const d = hist[hist.length - 1]
          const relay = d.relay || { pump: +d.pump || 0, light: +d.light || 0, fan: +d.fan || 0 }
          const luxTxt = d.lux >= 1000 ? (d.lux / 1000).toFixed(1) + 'klux' : (d.lux || '--') + 'lux'

          this.setData({
            latest: d, relay, luxTxt,
            mode: d.mode || 'auto',
            lastUpdate: formatTimeShort(d.ts),
            online: true,
            tempPct: Math.min(100, (d.temp / 50) * 100),
            humiPct: Math.min(100, d.humi),
            luxPct: Math.min(100, (d.lux / 20000) * 100),
            waterPct: Math.min(100, d.water),
          })
        }

        if (vis && vis.length) {
          const v = vis[0]
          this.setData({
            vision: {
              ...v,
              clsText: clsToText(v.cls),
              confPercent: Math.round(v.conf * 100),
              timeText: formatTs(v.ts),
              localImg: '',
            }
          })
          // 下载图片到本地（真机 HTTP 图片问题）
          if (v.url) {
            wx.request({
              url: v.url,
              responseType: 'arraybuffer',
              success: (r: any) => {
                if (r.statusCode === 200 && r.data) {
                  const b64 = wx.arrayBufferToBase64(r.data)
                  this.setData({ 'vision.localImg': 'data:image/jpeg;base64,' + b64 })
                }
              }
            })
          }
        }
      } catch (e) {
        console.log('主页数据拉取失败', e)
        this.setData({ online: false })
      }
    },

    onPullRefresh() {
      this.setData({ refreshing: true })
      this.fetch().finally(() => setTimeout(() => this.setData({ refreshing: false }), 400))
    },

    // 继电器切换
    async onRelay(e: any) {
      const r = e.currentTarget.dataset.r // pump / light / fan
      const cur = this.data.relay[r]
      const val = cur ? 0 : 1

      if (this.data.mode === 'auto') {
        wx.showModal({
          title: '提示',
          content: '自动模式下不能手动控制，要切到手动模式吗？',
          success: async (res) => {
            if (res.confirm) {
              await setMode('manual')
              this.setData({ mode: 'manual' })
              this._toggle(r, val)
            }
          }
        })
        return
      }
      this._toggle(r, val)
    },

    async _toggle(r: string, val: number) {
      wx.showLoading({ title: '下发…' })
      try {
        const res = await toggleRelay(r as any, val as any)
        wx.hideLoading()
        this.setData({ [`relay.${r}`]: val })
        wx.showToast({ title: res.status === 'acked' ? '已执行' : '已下发', icon: res.status === 'acked' ? 'success' : 'none' })
      } catch {
        wx.hideLoading()
        wx.showToast({ title: '失败', icon: 'none' })
      }
    },

    // 模式切换
    async onModeTap() {
      const next = this.data.mode === 'auto' ? 'manual' : 'auto'
      wx.showLoading({ title: '切换…' })
      try {
        await setMode(next as any)
        this.setData({ mode: next })
        wx.hideLoading()
        wx.showToast({ title: next === 'auto' ? '自动' : '手动', icon: 'success' })
      } catch {
        wx.hideLoading()
        wx.showToast({ title: '切换失败', icon: 'none' })
      }
    },

    // 快捷操作
    async doSnap() {
      wx.showLoading({ title: '下发…' })
      try {
        const r = await triggerSnap()
        wx.hideLoading()
        wx.showToast({ title: r.status === 'acked' ? '拍照中' : '已下发', icon: 'success' })
      } catch { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }) }
    },

    doAllOff() {
      wx.showModal({
        title: '确认', content: '关闭全部继电器？',
        success: async (r) => {
          if (!r.confirm) return
          wx.showLoading({ title: '下发…' })
          try {
            await toggleRelay('pump', 0)
            await toggleRelay('light', 0)
            await toggleRelay('fan', 0)
            this.setData({ relay: { pump: 0, light: 0, fan: 0 } })
            wx.hideLoading()
            wx.showToast({ title: '已全部关闭', icon: 'success' })
          } catch { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }) }
        }
      })
    },

    async doAuto() {
      wx.showLoading({ title: '切换…' })
      try { await setMode('auto'); this.setData({ mode: 'auto' }); wx.hideLoading(); wx.showToast({ title: '自动', icon: 'success' }) }
      catch { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }) }
    },

    async doManual() {
      wx.showLoading({ title: '切换…' })
      try { await setMode('manual'); this.setData({ mode: 'manual' }); wx.hideLoading(); wx.showToast({ title: '手动', icon: 'success' }) }
      catch { wx.hideLoading(); wx.showToast({ title: '失败', icon: 'none' }) }
    },

    goVision() { wx.switchTab({ url: '/pages/vision/vision' }) },
  }
})
