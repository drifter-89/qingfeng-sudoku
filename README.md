# 清风数独

一个无需账号和服务器的本地数独游戏。游戏进度与最佳成绩只保存在当前浏览器中。

## 本地运行

需要安装 Node.js 18 或更高版本，然后在项目目录执行：

```powershell
npm install
npm run dev
```

终端会显示本地访问地址，通常为 `http://localhost:5173`。

## 构建离线版本

```powershell
npm run build
npm run preview
```

构建文件会生成在 `dist` 目录。由于浏览器对 ES 模块的安全限制，建议使用 `npm run preview` 查看构建结果，而不是直接双击 `dist/index.html`。

## Windows 桌面版

直接启动桌面窗口：

```powershell
npm run desktop
```

生成可以直接双击运行的便携版 `.exe`：

```powershell
npm run package:win
```

成品会生成在 `release-final` 目录中，不需要安装。

## 操作

- 数字键 `1`–`9`：填入数字或候选数
- 方向键：移动当前选中格
- `Delete`、`Backspace` 或 `0`：擦除
- `N`：切换笔记模式
- 空格：暂停或继续

每道题都经过唯一解校验。刷新或关闭页面后，当前进度会自动恢复。

## iPhone / PWA

生产构建会自动生成 Web App Manifest 和离线 Service Worker。将 `dist` 发布到任意 HTTPS 静态托管后：

1. 使用 iPhone Safari 打开网址。
2. 点击分享按钮。
3. 选择“添加到主屏幕”。
4. 此后可从桌面图标全屏打开，并可离线游玩。

PWA 的离线能力要求 HTTPS；普通局域网 HTTP 地址只能临时浏览，不能可靠安装离线缓存。
