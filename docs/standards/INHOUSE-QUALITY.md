# In-house Quality Gate

本文件将 `In-house App Building Playbook 审核标准 V1` 与 `In-house App 生产工作流 V1` 收敛为仓库硬门禁。原始规范保留为依据；冲突时以 Constitution、根 `AGENTS.md` 与本文件依次裁决。

## 不可降低的交付条件

- 每个 miniapp 的目标为 S 级，不能以“原型”名义跳过主流程、内容与视觉审核。
- Mobile 是核心，Web fallback 也必须完成同一主流程。
- 主闭环必须包含：明确开始 → 核心互动 → 即时反馈 → 明确完成 → 重来或自然退出。
- 结果是否需要保存、分享或 Remix 由产品主题决定；没有结果卡不等于没有闭环。
- 默认界面只使用经过编辑的 `en-US`，不得中英混杂、出现占位符或未经人工判断的 AI 文案。
- 首屏三秒理解正确率目标至少 80%，由五人以上盲测或 Owner 接受的等价证据记录。
- 自动测试不能替代审美判断；视觉方向与最终美学必须由 Owner 签字并绑定截图或视频。

## Mobile 证据

进入 `READY_FOR_EAZO` 前，每个 miniapp 至少完成两轮最新正式 iPhone/iOS 真机自测。每轮记录：

- 设备、iOS、浏览器或 Eazo 容器版本
- viewport / orientation
- Git SHA 与内容 manifest hash
- 主闭环结果
- 截图或视频位置
- 缺陷、结论、测试人与时间

模拟器和 Playwright WebKit 是自动化证据，不冒充真机记录。没有两轮人工证据时保持 `BUILDING` 或 `REVIEW`。

## 发布边界

本仓库不执行发布。通过代码、内容、权利、隐私、无障碍、性能、自动化与人工审美门禁后，仅可进入 `READY_FOR_EAZO`。该状态表示可以交给 Eazo，不表示已发布或获准发布。
