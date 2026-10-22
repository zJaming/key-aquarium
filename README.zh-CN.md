# Key Aquarium · 敲敲养鱼

**每敲一次键盘，让桌面上的海底世界生长一点。**

[English](README.md) · 简体中文

Key Aquarium 是一个像素风桌面水族箱。把它放在工作区一角，日常打字就能迎来新的水族箱居民。慢慢收集物种、解锁成就，或在忙碌间隙点几个气泡。

使用 Vue 3、TypeScript、PixiJS 和 Tauri 2 构建。目前桌面端主要面向 **macOS**，应用界面使用简体中文。

## 下载

**[下载 macOS 安装包 · 支持 Apple Silicon 与 Intel](https://github.com/zJaming/key-aquarium/releases/latest/download/Key-Aquarium-macOS-universal.dmg)**

打开 `.dmg`，将 **Key Aquarium.app** 拖入 **Applications（应用程序）** 后启动。按照[权限与隐私](#权限与隐私)中的说明授予辅助功能权限，即可启用全局按键统计。

应用使用本地临时签名，尚未经 Apple 公证。macOS 可能阻止首次启动，请先阅读 [Apple 关于安全打开应用的说明](https://support.apple.com/en-us/102445)，再决定是否允许打开。

[所有版本](https://github.com/zJaming/key-aquarium/releases)中提供更新说明和 SHA-256 校验文件，应用更新需手动下载安装。

Windows 和 Linux 暂未实现全局键盘监听。

## 玩法

1. 正常打字，每次按键都会推进当前养成周期。
2. 进度满后，自动获得一位水族箱居民，加入收藏。
3. 随即进入下一轮，不同品质对应不同的进度目标。

每轮也可能获得已经收集过的物种。

水族箱底座的 **+** 按钮也能推进养成进度，点击次数与键盘按键次数分别统计。

### 认识水族箱居民

共有 **169 种物种**，分为普通、稀有、珍奇和传说四种品质。除了鱼，还有海马、水母、螃蟹等水生生物。打开图鉴，可以查看已经发现的物种和等待解锁的收藏。

### 按自己的节奏养鱼

- 随着收藏增加，逐步解锁气泡、开关灯和震动互动。
- 通过打字、收集物种和水族箱互动获得成就。
- 在状态面板查看今日按键、累计按键和常用键排行。
- 拖动、缩放或置顶透明窗口，也可以通过系统托盘隐藏和恢复。
- 在设置中调整按键反馈，或切换为少量物种显示模式。

鼠标移入应用后显示工具栏；解锁首个成就后会出现成就入口。

### 保存你的收藏

桌面版会在本机保存进度，设置中提供 JSON 导入和导出，方便备份或迁移。也可以在设置中清空数据：这会重置物种收藏、按键统计和成就，并保留设置、窗口位置及置顶偏好。

## 权限与隐私

macOS 全局按键统计需要**辅助功能**权限。请在「**系统设置 → 隐私与安全性 → 辅助功能**」中授权；也可以通过应用内的权限提示打开对应设置页面。

应用记录键位标识、次数和活动时间，用于养成进度与统计，不保存输入的文本，无需注册账号。

## 开发

### 环境要求

- Node.js 22.13+（22.x 系列）或 Node.js 24+。
- pnpm 9，与仓库固定的包管理器版本保持一致。
- Rust 1.88+。
- 桌面开发需要 macOS 和 Xcode Command Line Tools。

### 运行桌面版

```sh
git clone https://github.com/zJaming/key-aquarium.git
cd key-aquarium
pnpm install --frozen-lockfile
pnpm tauri dev
```

按照上方说明授予 macOS 权限，即可在使用其他应用时累计按键。

### 浏览器预览

```sh
pnpm dev
```

打开终端输出的本地地址。浏览器预览只响应页面内的按键，没有系统托盘和原生存档存储，刷新页面后进度会重置；如需保留，请先导出 JSON。

开发模式会显示用于预览物种和成就的测试按钮，正式构建会隐藏这些按钮。

### 检查与构建

| 命令 | 用途 |
| --- | --- |
| `pnpm typecheck` | 检查 TypeScript 和 Vue 类型 |
| `pnpm test` | 运行单元测试 |
| `pnpm build` | 检查类型并构建前端 |
| `pnpm tauri build` | 构建 macOS 桌面安装包 |

前端构建产物位于 `dist/`，桌面构建产物位于 `src-tauri/target/release/bundle/`。

## 许可证

[MIT](LICENSE) © 2026 Jaming。
