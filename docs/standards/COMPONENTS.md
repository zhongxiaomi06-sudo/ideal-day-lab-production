# Shared Component Contract

共享层只提供行为与质量基础，不统一项目视觉身份。

## 必须共享的行为

- `SafeAreaScreen`：安全区、动态视口、短屏滚动与语义主区。
- `PrimaryAction`：44 pt 触控目标、忙碌/禁用状态、键盘与辅助技术语义。
- `AudioControl` / `useMiniappAudio`：首次交互解锁、背景音乐、主题音效、静音持久化。
- `CompletionActions`：明确完成后的 Restart / Done / Exit 行为。
- `PermissionPrompt`：用户触发后再请求，并提供拒绝 fallback。
- `useOrientation` 与 `useKeyboardInset`：不可用时安全降级。

## 不共享的内容

- 颜色、字体组合、边框半径、背景图、插画语言、摄影裁切、具体音乐与音效。
- 通用 Hero、通用卡片皮肤或“Eazo 宿主适配”外观层。

项目可以包裹共享行为并重写全部视觉。共享组件 API 改动必须通过类型检查、单元测试，并至少在一个 React 项目和一个纯 DOM 项目验证降级路径。
