# Governed Miniapp Workflow

## 唯一状态机

`PITCH → APPROVED → READY_TO_BUILD → BUILDING → REVIEW → READY_FOR_EAZO`

- Owner 是 Pitch、规格、视觉方向、最终审美与交付的唯一批准人。
- 未经 Owner 明确批准的 Pitch，脚手架只能 dry-run，不创建项目文件。
- `READY_TO_BUILD` 由脚手架生成：七份项目文档、Spec Kit feature、项目入口、移动行为组件、测试骨架、registry 项与 To-Build 快照。
- 每次阶段变化、Owner 批准和 Eazo 交接都保存快照。
- 仓库终点为 `READY_FOR_EAZO`。Eazo 的反馈由 Owner 人工带回；项目只有在 Owner 明确要求后才回到 `BUILDING`。

## 权威层级

1. `.specify/memory/constitution.md`
2. 根 `AGENTS.md`
3. `docs/standards/`
4. 项目七份文档

实时项目状态以现有 To-Build List 为唯一来源；仓库中的 `evidence/to-build/` 是阶段快照，不自称替代实时列表。

## 新项目入口

```bash
pnpm miniapp:create -- --pitch path/to/approved-pitch.json --dry-run
pnpm miniapp:create -- --pitch path/to/approved-pitch.json --owner-approved
```

禁止手工创建空的 `apps/<slug>` 目录绕过流程。
