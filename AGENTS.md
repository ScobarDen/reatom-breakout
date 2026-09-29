## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `ScobarDen/reatom-breakout`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, label string equals the role name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Architecture

Read `docs/architecture.md` before touching code: levels, file roles, the frame and input flows, and the shared shell every build starts from. Invariants that tooling or tests hold, so keep them:

- `modules/breakout` model and config files are pure: no package imports, no Reatom, no DOM. Game rules change there and are tested through `step`.
- Board geometry (brick, paddle, serve point, wall limits) lives only in `model/board.model.ts`; physics and views both read it. Views never derive sizes from config.
- Builds see the module only through `src/modules/breakout/index.ts`; the test "the public surface" pins its exports, so change it deliberately.
- Only `app/` calls `advance`. Views are passive: the frame loop and key translation live in `app/shell`.
- `app/shell` never imports `@reatom/jsx`, `pages/`, or `modules/screens`: builds without screens (canvas, sound) reuse it (ADR-0004).
- Full builds (jsx, DOM, React) share one markup and the classes in `app/styles/breakout.css`.

## Commands

- `vp test run`: tests once (`vp test` watches).
- `vp check`: format, lint, and types; `vp check --fix` to fix.
- `vp run boundaries`: FEOD level check.
- `vp dev`: the jsx build on port 5173.

CI (`.github/workflows/ci.yml`) runs the same checks plus `vp build` as separate jobs and deploys the build to GitHub Pages from `main`. A change is done when `vp check`, `vp run boundaries`, and `vp test run` are green. The commit hook runs `vp check --fix` on staged files.

## Language

Human-facing prose is Russian. That covers the README, issues, specs, tracker comments, `CONTEXT.md`, ADRs, plans, reviews, summaries, and any other doc a person reads.

English stays the language of code, identifiers, code comments, config, commands, commit messages, and these agent instruction files. Inside Russian prose, keep identifiers, paths, commands, and quoted output in English.
