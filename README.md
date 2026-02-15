# 🔑 agentbar

CLI to manage multiple AI auth profiles and usage in one place.

## What It Does

- Stores multiple `codex` and `copilot` profiles in one local store.
- Switches the active Codex profile and applies it to Codex CLI auth.
- Fetches usage data for saved profiles with caching and concurrency controls.
- Supports per-profile notes for account context.

## Requirements

- [Bun](https://bun.sh/) `>= 1.3` (required at runtime)
- npm (optional, only if you install via npm)

`agentbar` is distributed through npm, but the executable runs with Bun (`#!/usr/bin/env bun`).

## Installation

Recommended (Bun):

```bash
bun add -g agentbar
agentbar --help
```

Alternative (npm):

```bash
npm install -g agentbar
agentbar --help
```

Update:

```bash
bun update -g agentbar
# or, if installed via npm:
npm update -g agentbar
```

## Quick Start

Check installed version:

```bash
agentbar --version
# or:
agentbar -v
```

Login and save profiles:

```bash
agentbar login codex
agentbar login copilot
```

List accounts:

```bash
agentbar accounts
agentbar accounts --json
```

Switch active Codex profile:

```bash
agentbar switch codex alice@example.com
```

Check usage:

```bash
agentbar usage
agentbar usage --provider codex
```

Set and clear notes:

```bash
agentbar note set codex alice@example.com "Work account"
agentbar note clear codex alice@example.com
```

Delete saved profiles:

```bash
agentbar delete codex alice@example.com --yes
agentbar delete copilot alice@example.com --yes
```

## Important Behavior

### Active Semantics

- `active` in `agentbar accounts` means the profile currently applied to Codex CLI.
- Only Codex supports active switching in `agentbar`.
- Copilot rows are always inactive and usage-only.

### Profile Selection

- Profile selection is case-insensitive by email.
- If multiple profiles share the same email, provide `--plan`.
- If required selectors are omitted in a TTY session, `agentbar` prompts interactively.
- In non-interactive mode, ambiguous selectors fail with an error.

### Non-Interactive Safety

- `agentbar delete ...` requires `--yes` outside interactive TTY.
- `note set` without note text requires interactive input; otherwise it fails.

### Codex Auth Apply Target

`agentbar switch codex` writes to:

- `$CODEX_HOME/auth.json` when `CODEX_HOME` is set
- `~/.codex/auth.json` otherwise

## Commands

```text
agentbar login codex
agentbar login copilot

agentbar accounts [provider] [--json]

agentbar switch codex [email] [--plan <plan>] [--json]

agentbar delete codex [email] [--plan <plan>] [--yes] [--json]
agentbar delete copilot [email] [--plan <plan>] [--yes] [--json]

agentbar usage [provider] [--provider codex|copilot] [--refresh] [--json]

agentbar note set <provider> [email] [note...] [--plan <plan>] [--json]
agentbar note clear <provider> [email] [--plan <plan>] [--json]

agentbar config [--json]
agentbar config list [--json]
agentbar config get <key> [--json]
agentbar config set <key> <value> [--json]
agentbar config unset <key> [--json]
```

## Storage and Security

Paths:

- Profile store: `~/.agentbar/store.json`
- Config: `~/.agentbar/config.json`
- Usage cache: `~/.agentbar/usage-cache.json`

Security model:

- Tokens are stored as plain JSON on disk.
- Treat `~/.agentbar/store.json` as a password file.
- Do not share or commit local store/config/cache files.
- On POSIX systems, files are written with `0600`.
- Store and cache writes use file locking for safer concurrent access.

## Configuration

Set and read config values:

```bash
agentbar config list
agentbar config get usage.timeoutMs
agentbar config set usage.timeoutMs 8000
agentbar config unset usage.timeoutMs
```

Supported keys:

- `usage.timeoutMs` (default `10000`, non-negative integer)
- `usage.ttlMs` (default `60000`, non-negative integer)
- `usage.errorTtlMs` (default `10000`, non-negative integer)
- `usage.concurrency` (default `4`, positive integer)

Usage cache behavior:

- Successful rows are cached for `usage.ttlMs`.
- Error rows are cached for `min(usage.errorTtlMs, usage.ttlMs)`.
- Use `agentbar usage --refresh` to bypass cache.

## Automation and Output

- Use `--json` on list/switch/delete/usage/note/config commands for machine-readable output.
- `NO_COLOR=1` disables ANSI colors.
- `FORCE_COLOR=1` forces ANSI colors.
- `AGENTBAR_DEBUG_TIMING=1` prints per-profile timing to stderr.
- `AGENTBAR_DEBUG_STACK=1` prints stack traces for unexpected errors.

## Development

```bash
git clone https://github.com/nbsp1221/agentbar
cd agentbar
bun install
bun run src/index.ts --help
bun run test
```

Watch mode:

```bash
bun run test:watch
```

## Release (Maintainers)

npm publish is automated by GitHub Actions on `v*` tag pushes.

```bash
npm version patch
git push origin main --follow-tags
```

Current workflow publishes with `npm publish --provenance`.

Current auth model: npm trusted publishing (OIDC).

One-time npm setup is required before the first release:

1. Open npm package settings for `agentbar`.
2. Add a Trusted Publisher for this GitHub repository/workflow.
3. Target workflow file: `.github/workflows/publish-npm.yml`.

After trusted publisher is configured, no `NPM_TOKEN` repository secret is needed.

## Disclaimer

`agentbar` is not affiliated with OpenAI or GitHub.
