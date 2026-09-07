# Ideal Day Lab Release

## 当前阶段

`BUILDING`。目标为 `READY_FOR_EAZO`，本仓库不发布。

## Owner approvals

九项目改造方向已由本次用户指令确认；最终审美、两轮真机证据和 `READY_FOR_EAZO` 尚未批准。

## Handoff 内容

源码、生产构建、七文档、测试记录、内容 manifest、权利台账、媒体、skill `design-ideal-day`、版本与回滚说明。

## Blockers

- 两轮 iPhone 17 / iOS 26.6 完整记录。
- Owner 基于真实截图/视频的最终审美签字。
- 公开部署前的 SDK 安全升级、包体和 source map 复核。
- 内容清单递归覆盖与媒体权利复核。

## Rollback

保留上一可验证 Git SHA 与内容 manifest；若宿主或媒体失败，交付本地编辑/保存 fallback，不发布不完整版本。

## 2026-09-07 QA 修改

- Eazo Link：<https://project-20d21547.eazo.dev>。
- 已修：首屏钟面 `1440` 改为用户可直接理解的 `24H`；顶部 handoff/灵动岛安全区改为单一取最大值，底部导航纳入设备安全区。
- 待验证：在 Eazo 宿主内对有/无灵动岛机型各跑两次主流程。
