# Ideal Day Lab Content

## 文案与数据

可见文案只用 `en-US`。分类、示例日程、比较说明与本地规则位于 `src/locales.ts`、`src/domain.ts` 和 `content/fixture.json`；比较基准位于 `content/comparison-ledger.json`。

## 资产与权利

日光视频、时间部件图和 OG 图位于 `content/`，来源与许可记录在 `content/rights-ledger.tsv`，交付哈希在 `content/data-manifest.json`。程序化背景声和 UI 音效由 Web Audio 合成，不依赖受保护录音。

## 编辑边界

比较是反思提示，不是规范性结论。任何统计类说明都需保留单位、来源与版本；分享前使用 `sanitizeForShare` 删除标题、原始文本和身份信息。

## 阻断

内容 manifest 的递归覆盖与媒体压缩仍需在 Eazo 交付前复核。
