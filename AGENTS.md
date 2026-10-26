# Repository Guidelines

## Local database-auto-erd workspace
- Run locally with OrbStack Docker Compose: `pnpm local:setup`, then `pnpm local:start`.
- The application is available only at `http://127.0.0.1:3400`. No Kubernetes or Nginx is needed for this scope.
- PostgreSQL collection is read only. Keep schema snapshots separate from diagram positions, annotations, hidden tables, and logical relationships.
- Project credential handling is documented in [docs/CREDENTIALS.md](docs/CREDENTIALS.md). Read and store project credential references there; it is local-only, excluded via `.git/info/exclude`, and must never be committed. Keep key values and DB passwords out of shared files and logs.
- Use Node 22 and the pinned pnpm version. Preserve the global Git hook dispatcher and repository hooks when installing dependencies; the upstream prepare script can replace a global hook.
- Keep GitHub Actions disabled until a workflow is explicitly requested.

## Project Structure & Modules
- frontend/apps/*: Next.js apps (e.g., `@liam-hq/app`, `@liam-hq/docs`).
- frontend/packages/*: Shared libraries and tools (e.g., `schema`, `erd-core`, `cli`, `ui`).
- frontend/internal-packages/*: Infra and tooling (`e2e`, `configs`, `storybook`).
- assets/: Images and media. docs/: Documentation. scripts/: Repo utilities.

## Build, Test, and Development
- Install: `pnpm install`
- All apps/packages (Turbo):
  - Dev: `pnpm dev` (or one app: `pnpm -F @liam-hq/app dev`)
  - Build: `pnpm build`
  - Test (unit): `pnpm test`
  - E2E (Playwright): `pnpm test:e2e`
  - Coverage: `pnpm test:coverage`
- App-only examples:
  - Run Next dev: `pnpm -F @liam-hq/app dev:next`
  - Build Next: `pnpm -F @liam-hq/app build`

## Coding Style & Naming
- Language: TypeScript/TSX; React components in PascalCase (e.g., `App.tsx`); utilities in camelCase (e.g., `mergeSchema.ts`).
- CSS Modules: `*.module.css` with typed CSS via `typed-css-modules`.
- Lint/Format: Biome and ESLint. Run `pnpm fmt` and `pnpm lint`. Pre-commit hooks run `pnpm lint` (see `lefthook.yml`).

## Testing Guidelines
- Unit tests: Vitest. Place near source as `*.test.ts(x)` or in `__tests__/`.
- E2E tests: Playwright in `frontend/internal-packages/e2e`.
- Commands: `pnpm test` for unit, `pnpm test:e2e` for Playwright, `pnpm test:coverage` for V8 coverage.

## Commit & Pull Requests
- Commit style: Conventional Commits (e.g., `feat:`, `fix:`, `chore(deps): ...`).
- Before pushing: `pnpm fmt && pnpm lint && pnpm test`.
- PRs: clear description, linked issues, screenshots for UI changes, and note any env or migration impacts.
- Versioning: If you change a publishable package, add a changeset: `pnpm changeset`.

## Security & Configuration
- Environment: use `.env`/`.env.local` (created automatically by `pnpm prebuild`). Never commit secrets.
- Sync Vercel envs (optional): `pnpm vercel:env-pull` and link with `pnpm vercel:link`.
- Common vars: `NEXT_PUBLIC_*`, Sentry keys, and job runner tokens (see `turbo.json` env list).

## Tips
- Target a single package with `pnpm -F <package-name> <script>`.
- Use Turbo filters when running large tasks locally for faster feedback.
