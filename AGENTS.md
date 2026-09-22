## Agent skills

### Issue tracker

Issues and specs live as GitHub issues on `ScobarDen/reatom-breakout`. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles, label string equals the role name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Language

Human-facing prose is Russian. That covers the README, issues, specs, tracker comments, `CONTEXT.md`, ADRs, plans, reviews, summaries, and any other doc a person reads.

English stays the language of code, identifiers, code comments, config, commands, commit messages, and these agent instruction files. Inside Russian prose, keep identifiers, paths, commands, and quoted output in English.
