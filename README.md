# 守灯人 Lightkeeper

一个安静的放置游戏：你守着大海上一座破旧的灯塔，海浪会把各种东西冲到灯塔边。
捞起它们，修整渔网和储物箱。你不在的时候，潮水也在替你攒东西。

- 设计文档：`docs/superpowers/specs/2026-11-23-lighthouse-idle-design.md`
- 当前进度：第一阶段（灯塔基地）

## 在线试玩

<https://tony072319.github.io/Games/>

加上 `?debug=1` 会出现调试按钮（快进时间、加材料），方便检查长期节奏：
<https://tony072319.github.io/Games/?debug=1>

## 第一次开启网址（仓库主人只需做一次）

1. 把仓库设为公开：GitHub 仓库页面 → **Settings** → **General** → 最下方 **Danger Zone** → **Change visibility** → **Public**。
2. 打开网页托管：**Settings** → **Pages** → **Build and deployment** → **Source** 选 **GitHub Actions**。
3. 之后每次推送代码，GitHub 会自动测试、打包并更新网址（在仓库的 **Actions** 页面能看到进度，大约 1–2 分钟）。

如果部署时提示分支不允许（"not allowed to deploy to github-pages"）：
**Settings** → **Environments** → **github-pages** → 在 **Deployment branches** 里添加 `claude/*`，或者把代码合并到 `main`。

## 本地开发

```bash
npm install
npm run dev      # 本地预览
npm test         # 单元测试
npm run build    # 打包到 dist/
npm run e2e      # 浏览器自动试玩（需要先 build，需要 Playwright）
```
