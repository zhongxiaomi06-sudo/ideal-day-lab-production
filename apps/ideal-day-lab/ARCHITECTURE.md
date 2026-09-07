# Ideal Day Lab Architecture

## 模块

- `src/App.tsx`：视图、编辑交互、完成与 fallback。
- `src/domain.ts`：1440 分钟守恒、边界调整、分类、比较与分享净化纯函数。
- `src/repository.ts`：本地计划持久化。
- `src/eazo.ts`：宿主 adapter；普通浏览器使用安全 fallback。
- `src/sound.ts`：首次有效交互后创建的主题背景声与反馈音。

## 状态与存储

编辑状态在 React 内存；计划、声音偏好与必要 UI 偏好保存在本地。领域函数不依赖 DOM，便于单元测试。

## Resilience

无 App ID、分享失败、存储不可用或音频被拒绝时，核心编辑仍可完成并显示可理解提示。外部 SDK 必须留在 adapter 边界。

## 性能边界

媒体延迟加载；账户/分享能力应按动作加载。现有主包曾超过 200 KB gzip 目标，交付前需继续拆分。
