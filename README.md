# DeepSeek 峰谷计时器

在 DeepSeek Harness 的输入框旁显示倒计时，帮助你查看当前是高峰还是空闲时段，以及距离下一次切换还有多久。

**版本：0.1.0 · 已验证：Dsh 0.2.0-rc.2 / Windows x64 · MIT**

## 怎么看

| 颜色 | 当前状态 | 倒计时含义 |
| --- | --- | --- |
| 红色 | 高峰时段 | 距离本次高峰结束还有多久 |
| 绿色 | 空闲时段 | 距离下一次高峰开始还有多久 |

界面只显示时间，例如 `02:15:30`。鼠标悬停可查看当前状态和下一次切换的北京时间。

遇到长假，小时数可以超过 24。例如 `138:09:07` 表示还有 138 小时 9 分 7 秒。

## 特点

- 按北京时间计算，不受电脑当前时区影响。
- 内置 2026 年全国放假安排，周末和假期按空闲时段处理。
- 默认显示在模型选择按钮左侧；空间不足时自动移到输入框下方右侧。
- 每秒更新，电脑休眠唤醒后重新计算。
- 跟随 Dsh 当前界面字体，可与外观插件一起使用，也可以独立使用。
- 不需要 DeepSeek API Key，不调用模型，不自动联网。

## 峰谷规则

根据 [DeepSeek 官方定价说明](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)，北京时间周一至周五，排除中国节假日：

| 时间 | 状态 |
| --- | --- |
| 09:00–12:00 | 高峰 |
| 14:00–18:00 | 高峰 |
| 其他时间 | 空闲 |
| 周末、节假日全天 | 空闲 |

例如 12:00 开始为空闲，14:00 开始为高峰；周末调休上班仍按周末处理。插件的节假日日历采用 [国务院公布的 2026 年放假安排](https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm)。

插件只显示时间，不改变模型、价格或请求行为；实际计费以 DeepSeek 官方规则为准。

## 安装

先启动过一次 Dsh 桌面版，再通过 **应用 → 退出** 完全退出。

下载 `dsh-peak-timer-0.1.0.tgz` 后，在终端运行以下命令。将路径换成安装包的实际位置：

```text
dsh plugin --profile desktop add "C:\Downloads\dsh-peak-timer-0.1.0.tgz" --offline
```

重新打开 Dsh，计时器会自动出现在输入框旁。

也可以下载或克隆本仓库，安装完整插件目录，无需先构建：

```text
dsh plugin --profile desktop add "C:\Projects\dsh-peak-timer" --offline
```

请使用 **Dsh 桌面版自带的 `dsh` 命令**。找不到命令时，先在 Dsh 的应用菜单中管理／安装 dsh 命令，再重新打开终端。详见 [Dsh 桌面版说明](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md)。

在 **插件** 页面可通过 `dsh-peak-timer` 的开关启用或停用。

## 常见问题

**为什么出现“预计”？**

目前内置完整日历只有 2026 年。当当前日期或下一次切换跨入尚未录入的年份，计时器会标注“预计”，因为还无法确认该年的所有节假日。

**计时器为什么移到了输入框下方？**

输入框可用宽度小于 650 CSS 像素时，会自动移到下方，避免挤占模型选择和发送按钮。也可以配置为始终显示在下方。

**能自动更新以后的节假日吗？**

目前不会自动联网更新。可以安装更新版本，或自行补充下方的日历配置。

## 可选配置

默认无需配置。需要调整时，在 Dsh 的 **设置 → 打开配置文件** 中找到已有的 `dsh-peak-timer` 条目，保留原条目，只修改 `config`：

```yaml
- id: dsh-peak-timer
  name: dsh-peak-timer
  config:
    placement: auto
    additionalHolidays: []
    additionalCalendarYears: []
```

| 字段 | 用途 |
| --- | --- |
| `placement` | `auto` 自动调整位置；`bottom` 固定在输入框下方 |
| `additionalHolidays` | 补充全天空闲日期，格式为 `YYYY-MM-DD`，例如 `["2027-01-01"]` |
| `additionalCalendarYears` | 标记已完整录入日历的年份，例如 `["2027"]` |

只有录入该年**所有全国放假日期**后，才将年份加入 `additionalCalendarYears`；它会取消该年的“预计”提示。日期也不会改变周末始终为空闲的规则。

## 移除

完全退出 Dsh 后运行，再重新启动：

```text
dsh plugin --profile desktop remove dsh-peak-timer
```

## 开发

需要 Node.js。进入本仓库目录后运行：

```text
npm run build
npm test
```

构建不联网，不需要额外的打包器。源码在 `src`，构建产物在 `lib`；时间与节假日逻辑集中在 `src/calendar.cjs`。

测试覆盖高峰边界、午休、周末、节假日、北京时间、跨年提示、补充日历及客户端加载。真实桌面已验证新会话中的显示和宽／窄布局；已有对话使用相同输入框插槽，尚未通过实际模型对话测试。

目前只验证了 Dsh 0.2.0-rc.2 / Windows x64。Dsh 升级后可能需要适配输入框布局。

## 项目文档

- [参与贡献](CONTRIBUTING.md)：问题反馈、修改代码和提交贡献。
- [更新记录](CHANGELOG.md)：各版本的功能和变化。

## 许可证

使用 [MIT License](LICENSE)。本项目是社区插件。
