// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 初始化设备ID
    if (!wx.getStorageSync('device_id')) {
      wx.setStorageSync('device_id', 'gh01')
    }
  },
})
