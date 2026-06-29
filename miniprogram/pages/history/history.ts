// history.ts — 历史数据 + 图表
import { getHistory, formatTimeShort } from '../../utils/api'
import type { TeleData } from '../../utils/api'

Component({
  data: {
    range: 'recent' as string,
    metric: 'temp' as string,
    mLabel: '温度', mColor: '#ff5722', mUnit: '°C',
    rangeLabel: '最近',
    all: [] as TeleData[],
    table: [] as any[],
    stats: null as any,
    pumpPct: 0, lightPct: 0, fanPct: 0,
  },

  lifetimes: { attached() { this.load() } },

  methods: {
    async load() {
      wx.showLoading({ title: '加载' })
      try {
        const d = await getHistory()
        if (d && d.length) { this.setData({ all: d }); this.render() }
      } catch (e) { console.log('历史加载失败', e); wx.showToast({ title: '加载失败', icon: 'none' }) }
      wx.hideLoading()
    },

    render() {
      const { all, range, metric } = this.data
      if (!all.length) return

      // 时间过滤
      const now = Math.floor(Date.now() / 1000)
      let list = all
      if (range === 'day') list = all.filter(d => d.ts >= now - 86400)
      else if (range === 'week') list = all.filter(d => d.ts >= now - 7 * 86400)
      if (!list.length) list = all.slice(-50)

      // 指标
      const M: Record<string, any> = {
        temp: { l: '温度', c: '#ff5722', u: '°C' },
        humi: { l: '湿度', c: '#1e88e5', u: '%' },
        lux: { l: '光照', c: '#ffb300', u: 'lux' },
        water: { l: '水位', c: '#00acc1', u: '%' },
      }
      const m = M[metric]

      // 统计
      const vals = list.map(d => +(d as any)[metric] || 0)
      const cur = vals[vals.length - 1]
      const max = Math.max(...vals), min = Math.min(...vals)
      const avg = (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)

      // 表格
      const tbl = list.slice(-20).reverse().map(d => ({
        ...d,
        t: formatTimeShort(d.ts),
        luxT: d.lux >= 1000 ? (d.lux / 1000).toFixed(1) + 'k' : '' + d.lux,
      }))

      // 继电器占比
      const n = list.length || 1
      const pPct = Math.round(list.filter(d => d.pump).length / n * 100)
      const lPct = Math.round(list.filter(d => d.light).length / n * 100)
      const fPct = Math.round(list.filter(d => d.fan).length / n * 100)

      const rMap: Record<string, string> = { recent: '最近', day: '今日', week: '本周' }

      this.setData({
        mLabel: m.l, mColor: m.c, mUnit: m.u,
        rangeLabel: rMap[range],
        stats: { cur, max, min, avg, u: m.u },
        table: tbl,
        pumpPct: pPct, lightPct: lPct, fanPct: fPct,
      })

      this.drawChart(list, metric, m.c)
    },

    // Canvas 2D 折线图
    drawChart(data: TeleData[], metric: string, color: string) {
      wx.createSelectorQuery().select('#lineChart')
        .fields({ node: true, size: true }).exec((res) => {
          if (!res || !res[0] || !res[0].node) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          const dpr = wx.getSystemInfoSync().pixelRatio || 2
          const W = res[0].width, H = res[0].height
          canvas.width = W * dpr; canvas.height = H * dpr
          ctx.scale(dpr, dpr)

          const pad = { t: 28, r: 18, b: 48, l: 50 }
          const cw = W - pad.l - pad.r, ch = H - pad.t - pad.b

          const vals = data.map(d => +(d as any)[metric] || 0)
          const labels = data.map(d => formatTimeShort(d.ts))
          const maxV = Math.max(...vals) * 1.1 || 10
          const minV = Math.min(0, Math.min(...vals))
          const rng = maxV - minV || 1

          ctx.clearRect(0, 0, W, H)

          // 网格线
          ctx.strokeStyle = '#eee'; ctx.lineWidth = 1
          ctx.font = '10px sans-serif'; ctx.fillStyle = '#aaa'
          for (let i = 0; i <= 4; i++) {
            const y = pad.t + (ch / 4) * i
            ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke()
            ctx.textAlign = 'right'
            ctx.fillText((maxV - rng / 4 * i + minV).toFixed(metric === 'lux' ? 0 : 1), pad.l - 6, y + 4)
          }

          // X 轴
          ctx.textAlign = 'center'
          const step = Math.max(1, Math.floor(data.length / 6))
          for (let i = 0; i < data.length; i += step) {
            ctx.fillText(labels[i], pad.l + (i / (data.length - 1 || 1)) * cw, H - 10)
          }

          if (vals.length < 2) return

          // 渐变填充
          ctx.beginPath()
          for (let i = 0; i < vals.length; i++) {
            const x = pad.l + (i / (vals.length - 1)) * cw
            const y = pad.t + ch - ((vals[i] - minV) / rng) * ch
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.lineTo(pad.l + cw, pad.t + ch); ctx.lineTo(pad.l, pad.t + ch); ctx.closePath()
          const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch)
          g.addColorStop(0, color + '35'); g.addColorStop(1, color + '05')
          ctx.fillStyle = g; ctx.fill()

          // 折线
          ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round'
          for (let i = 0; i < vals.length; i++) {
            const x = pad.l + (i / (vals.length - 1)) * cw
            const y = pad.t + ch - ((vals[i] - minV) / rng) * ch
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.stroke()

          // 末尾点
          const lx = pad.l + cw, ly = pad.t + ch - ((vals[vals.length - 1] - minV) / rng) * ch
          ctx.beginPath(); ctx.arc(lx, ly, 5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
          ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
        })
    },

    onRange(e: any) { this.setData({ range: e.currentTarget.dataset.v }); this.render() },
    onMetric(e: any) { this.setData({ metric: e.currentTarget.dataset.v }); this.render() },
  }
})
