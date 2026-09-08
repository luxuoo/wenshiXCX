# 智能温室种植系统 — 微信小程序 (wenshiXCX)

「智能温室种植系统」的微信小程序客户端，基于 **TypeScript + 微信原生小程序框架** 构建，提供移动端的环境监测与设备控制能力。

## 功能

- 4 个 Tab 页面：环境数据总览、设备控制、病害识别记录、个人/设置
- 实时查看温室环境数据（温度、湿度、光照、水位、空气质量）
- 远程控制补光灯、风扇、水泵等继电器设备
- 查看作物病害 AI 识别结果与历史记录

## 项目结构

```
├── miniprogram/          # 小程序源码（miniprogramRoot）
│   ├── app.ts            # 小程序入口
│   ├── app.json          # 全局配置
│   ├── app.wxss          # 全局样式
│   ├── pages/            # 页面
│   ├── utils/            # 工具函数
│   └── images/           # 静态资源
├── project.config.json   # 微信开发者工具项目配置
├── tsconfig.json
└── typings/
```

## 开发调试

1. 用微信开发者工具打开本仓库目录
2. 项目已配置 TypeScript 编译插件
3. 在 `utils/` 或页面配置中确认后端接口地址（默认指向智能温室系统后端）

## 在系统架构中的位置

- 微信小程序端：本仓库
- Web 面板：`zhihuiWEB`（Vue 3）
- ESP32-S3 网关节点：`zhihuiNYesp32`
- STM32 传感器节点：`STM32zhihui`
- 串口/MQTT 调试工具：`mqtt-cj-vscode`

## 许可证

MIT
