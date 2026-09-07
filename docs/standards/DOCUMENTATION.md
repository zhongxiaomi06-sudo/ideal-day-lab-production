# Project Documentation Contract

每个 `apps/<slug>/` 恰好维护以下七份顶层 Markdown 文档：

1. `README.md`：入口、命令、端口、状态与七份文档索引。
2. `PRODUCT.md`：用户、问题、边界、主闭环与验收。
3. `DESIGN.md`：项目独立视觉/声音方向、参考原则与当前整改差距。
4. `CONTENT.md`：文案、数据、资产、来源、权利与 manifest。
5. `ARCHITECTURE.md`：模块、状态、存储、依赖与 fallback。
6. `TESTING.md`：自动化矩阵、两轮真机记录与已知缺口。
7. `RELEASE.md`：阶段、Owner 批准、交付内容、blocker 与回滚。

根目录只保存全局规范、工作区索引、Spec Kit 和跨项目工具。项目事实不得在根目录维护第二份副本。历史审核中的有效事实迁移到对应七份文档后，旧审核文档删除。
