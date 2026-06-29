// vision.ts
import { getVisionLatest, triggerSnap, formatTs, clsToText } from '../../utils/api'
import type { VisionRecord } from '../../utils/api'

interface DisplayRecord extends VisionRecord {
  clsText: string
  confPercent: number
  timeText: string
  localImg: string  // base64 或本地临时路径，用于真机显示
  imgLoading: boolean
}

Component({
  data: {
    records: [] as DisplayRecord[],
    pestCount: 0,
    healthyCount: 0,
    refreshing: false,
    loading: false,
  },

  lifetimes: {
    attached() { this.loadData() }
  },

  methods: {
    async loadData() {
      this.setData({ loading: true })
      try {
        const list = await getVisionLatest()
        if (!list || !list.length) { this.setData({ loading: false }); return }

        const records: DisplayRecord[] = list.map(v => ({
          ...v,
          clsText: clsToText(v.cls),
          confPercent: Math.round(v.conf * 100),
          timeText: formatTs(v.ts),
          localImg: '',
          imgLoading: true,
        }))

        this.setData({
          records,
          loading: false,
          pestCount: records.filter(r => r.pest).length,
          healthyCount: records.filter(r => !r.pest).length,
        })

        // 逐个下载图片到本地（解决真机 HTTP 图片不显示的问题）
        this.downloadAllImages(records)
      } catch (e) {
        console.log('视觉数据加载失败', e)
        this.setData({ loading: false })
      }
    },

    // 用 wx.request 下载图片为 base64，绕过 <image> 标签的 HTTP 限制
    downloadAllImages(records: DisplayRecord[]) {
      records.forEach((rec, idx) => {
        if (!rec.url) return

        wx.request({
          url: rec.url,
          responseType: 'arraybuffer',
          success: (res) => {
            if (res.statusCode === 200 && res.data) {
              // arraybuffer → base64
              const base64 = wx.arrayBufferToBase64(res.data)
              const dataUrl = 'data:image/jpeg;base64,' + base64
              this.setData({ [`records[${idx}].localImg`]: dataUrl, [`records[${idx}].imgLoading`]: false })
            } else {
              this.setData({ [`records[${idx}].imgLoading`]: false })
            }
          },
          fail: () => {
            // 下载失败，标记不再加载
            this.setData({ [`records[${idx}].imgLoading`]: false })
          }
        })
      })
    },

    onPullRefresh() {
      this.setData({ refreshing: true })
      this.loadData().finally(() => setTimeout(() => this.setData({ refreshing: false }), 400))
    },

    onRefresh() {
      wx.showLoading({ title: '刷新' })
      this.loadData().finally(() => wx.hideLoading())
    },

    // 点击预览大图
    onPreview(e: any) {
      const i = e.currentTarget.dataset.index
      wx.previewImage({
        current: this.data.records[i].url,
        urls: this.data.records.map(r => r.url),
      })
    },

    async onTriggerSnap() {
      wx.showLoading({ title: '发送中' })
      try {
        const r = await triggerSnap()
        wx.hideLoading()
        wx.showToast({ title: r.status === 'acked' ? '拍照中…' : '已下发', icon: 'success' })
        if (r.status === 'acked') setTimeout(() => this.loadData(), 5000)
      } catch {
        wx.hideLoading()
        wx.showToast({ title: '下发失败', icon: 'none' })
      }
    },
  }
})
