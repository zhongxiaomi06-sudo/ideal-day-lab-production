# Ideal Day Lab

通过文字描述生成、编辑和保存一份可执行的理想日程，并从日程结构中提炼个人偏好。

## Project contract

- Package: `@eazo/ideal-day-lab`
- Local URL: <http://127.0.0.1:5101>
- Runtime: React + TypeScript + Vite
- Locale: English (`en-US`)
- E2E: `tests/e2e/project.spec.ts`

## Commands

```bash
pnpm --filter @eazo/ideal-day-lab dev --host 127.0.0.1
pnpm --filter @eazo/ideal-day-lab typecheck
pnpm --filter @eazo/ideal-day-lab build
pnpm exec playwright test --project=day-chromium-mobile
```

Without an Eazo App ID, authentication and sharing use the documented browser-safe behavior.

## Project documents

- [Product](./PRODUCT.md) · [Design](./DESIGN.md) · [Content](./CONTENT.md)
- [Architecture](./ARCHITECTURE.md) · [Testing](./TESTING.md) · [Release](./RELEASE.md)
