# Ideal Day Lab Testing

## 自动化矩阵

- `src/domain.test.ts` 覆盖时间守恒、吸附、分类、分享净化、边界和历史比较。
- `tests/e2e/project.spec.ts` 覆盖英文入口与开始编辑；目标扩展覆盖完成、静音持久化、离线和重启。
- 根级 Playwright 视口：320×568、390×844、WebKit 390×844、1440×1000，并补手机横屏视觉检查。

## 已验证证据

2026-09-04：目标范围 TypeScript 检查通过。完整 lint、构建和更新后的 E2E 结果在本功能最终验证后补录，不提前宣称通过。

## Mobile run 1

待执行：iPhone 17 / iOS 26.6；记录浏览器/Eazo 版本、viewport、Git SHA、manifest hash、主闭环和截图。

## Mobile run 2

待执行：同一正式基线的独立完整运行；不得用模拟器替代。

## 已知缺口

真机两轮、键盘避让、包体/Lighthouse、Eazo 宿主分享与视觉 Owner 复核尚未完成。

## 2026-09-04 自动化记录

目标范围 lint/typecheck/build 通过；13 个测试文件共 131 项通过；九应用 Chromium/WebKit 五视口矩阵 45/45 通过。390×844 截图：`test-results/visual-nine/ideal-day-lab-390x844.png`。两轮真实 iPhone 与 Owner 签字仍阻塞。
