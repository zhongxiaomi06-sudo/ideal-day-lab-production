# Eazo Handoff Standard

每个 `READY_FOR_EAZO` 包必须包含：

- 可运行 build 与完整 source
- 七份项目文档
- 自动化验证报告与失败记录
- 两轮最新正式 iPhone/iOS 真机证据
- 内容 manifest、媒体、字体、音乐、音效与权利台账
- 版本、Git SHA、manifest hash、已知 blocker 和回滚说明
- Owner 对最终视觉与交付状态的明确批准

交接前检查离线资源路径、网络失败 fallback、权限拒绝、静音持久化、英文文案、无水印要求与 320px 短屏。仓库只生成交付包，不调用 Eazo 发布动作。
