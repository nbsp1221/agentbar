# agentbar

`agentbar` is a CLI for managing multiple AI account credentials and checking usage in one place.

The goal is to reduce re-login friction when you work across multiple accounts.

## Status

Early-stage MVP. Core flows are implemented and tested, but APIs and UX may still change.

## Features (MVP)

- Multi-profile auth store (`~/.agentbar/store.json`)
- Provider login flows:
  - `login codex` (OAuth)
  - `login copilot` (GitHub device flow)
- Account listing:
  - `accounts [provider] [--json]`
- Account deletion:
  - `delete codex [email] [--plan plus|team|...] [--yes] [--json]`
  - `delete copilot [email] [--plan individual|business|...] [--yes] [--json]`
- Codex account switching:
  - Interactive: `switch codex`
  - Non-interactive: `switch codex <email> [--plan plus|team|...]`
- Active marker semantics:
  - `accounts` `active` column tracks the profile currently applied to Codex CLI.
  - Copilot is usage-only in agentbar and is always shown as inactive.
- Usage aggregation:
  - `usage [provider] [--provider codex|copilot] [--refresh] [--json]`
- Settings:
  - Read/write: `config`, `config list|get|set|unset`
  - Config file: `~/.agentbar/config.json`
- Profile notes:
  - Add a short note per profile and show it in `accounts` / `usage` output.

## Why agentbar?

If you use multiple AI coding accounts, you usually need to:
- keep track of which Codex account is active,
- inspect usage/reset windows across services,
- and manually swap auth files repeatedly.

`agentbar` centralizes those tasks into one CLI workflow.

## Requirements

- [Bun](https://bun.sh/) `>= 1.3`

## Installation

### Install with Bun (recommended)

```bash
# Install from GitHub. Use a tag/commit to pin a version.
bun add -g github:nbsp1221/agentbar#main
agentbar --help
```

Update to the latest `main` after installation:

```bash
bun update -g agentbar
```

If `agentbar` is not found, add Bun global bin to your `PATH`:

```bash
# Linux/macOS
export PATH="$HOME/.bun/bin:$PATH"

# Windows (PowerShell)
$env:Path += ";$HOME\\.bun\\bin"
```

### Install from a local path (development)

```bash
bun add -g file:/absolute/path/to/agentbar
agentbar --help
```

## Quick Start

Login:

```bash
agentbar login codex
agentbar login copilot
```

`login codex` only saves a profile. To apply it to Codex CLI, run `agentbar switch codex ...`.

List saved accounts:

```bash
agentbar accounts
agentbar accounts --json
agentbar accounts codex
```

In `accounts`, `active` means the profile currently applied to Codex CLI.  
Copilot rows are always inactive by design.

Delete a saved account:

```bash
agentbar delete codex alice@example.com --yes
agentbar delete copilot alice@example.com --yes

# when same email has multiple Codex plans
agentbar delete codex alice@example.com --plan team --yes
# when same email has multiple Copilot plans
agentbar delete copilot alice@example.com --plan business --yes
```

Add a note to a profile:

```bash
agentbar note set codex alice@example.com "Work account"
agentbar note set copilot alice@example.com "Monthly quota"

# when same email has multiple profiles
agentbar note set codex alice@example.com --plan plus "Personal"
```

If you omit selectors or note text, `agentbar` will switch to interactive prompts (TTY only).

Switch active Codex account:

```bash
# interactive
agentbar switch codex

# non-interactive
agentbar switch codex alice@example.com

# disambiguate same-email profiles by plan
agentbar switch codex alice@example.com --plan team
```

Check usage:

```bash
agentbar usage
agentbar usage codex
agentbar usage copilot
agentbar usage --provider codex --json
```

`agentbar usage` prints provider-specific sections (Codex/Copilot) with domain-specific columns.

View and update settings:

```bash
agentbar config
agentbar config list
agentbar config get usage.timeoutMs
agentbar config set usage.timeoutMs 8000
agentbar config unset usage.timeoutMs
```

## Disclaimer

`agentbar` is not affiliated with OpenAI or GitHub.

## Command Reference

```text
agentbar login codex
agentbar login copilot
agentbar accounts [provider] [--json]
agentbar switch codex [email] [--plan plus|team|...] [--json]
agentbar delete codex [email] [--plan plus|team|...] [--yes] [--json]
agentbar delete copilot [email] [--plan individual|business|...] [--yes] [--json]
agentbar usage [provider] [--provider codex|copilot] [--refresh] [--json]
agentbar note set <provider> [email] [note...] [--plan <provider-plan>] [--json]
agentbar note clear <provider> [email] [--plan <provider-plan>] [--json]
agentbar config [--json]
agentbar config list [--json]
agentbar config get <key> [--json]
agentbar config set <key> <value> [--json]
agentbar config unset <key> [--json]
```

## Storage & Security

- Auth profiles are stored in: `~/.agentbar/store.json`
- The store is plain JSON on disk. Treat it like a password file:
  - do not share it,
  - do not commit it,
  - use `agentbar delete ...` if you need to remove a profile.
- On POSIX systems, file permissions are hardened to `0600`.
- Store writes are protected with file locking to reduce concurrent write issues.
- `switch codex` applies the selected profile to Codex auth at:
  - `$CODEX_HOME/auth.json` (if `CODEX_HOME` is set), or
  - `~/.codex/auth.json`

## Configuration

### Usage fetch performance

`agentbar usage` calls provider APIs and can take a few seconds depending on network and how many profiles you have.
To keep repeated runs fast, `agentbar` uses a small TTL cache:

- Cache file: `~/.agentbar/usage-cache.json`
- Bypass cache: `agentbar usage --refresh`
- Settings file: `~/.agentbar/config.json`

Use `agentbar config list/get/set/unset` to manage these values:

- `usage.timeoutMs` (default: `5000`)
  - Per-profile HTTP timeout for usage fetch.
- `usage.ttlMs` (default: `60000`)
  - Cache TTL for successful usage rows.
- `usage.errorTtlMs` (default: `10000`)
  - Cache TTL for error usage rows (shorter by default so transient errors recover quickly).
- `usage.concurrency` (default: `4`)
  - Max number of profiles fetched concurrently.

Supported keys for key-based commands:

- `usage.timeoutMs` (non-negative integer)
- `usage.ttlMs` (non-negative integer)
- `usage.errorTtlMs` (non-negative integer)
- `usage.concurrency` (positive integer)

Example `config.json`:

```json
{
  "usage": {
    "timeoutMs": 5000,
    "ttlMs": 60000,
    "errorTtlMs": 10000,
    "concurrency": 4
  }
}
```

Debug environment variables:

- `AGENTBAR_DEBUG_TIMING=1`
  - Prints per-profile timing info to stderr (no secrets).
- `AGENTBAR_DEBUG_STACK=1`
  - Prints stack traces for unexpected errors.

### Output colors

- `NO_COLOR=1` disables ANSI colors.
- `FORCE_COLOR=1` forces ANSI colors (useful in CI logs).

## Development

Install and run locally from source:

```bash
git clone https://github.com/nbsp1221/agentbar
cd agentbar
bun install
bun run src/index.ts --help
```

Run tests:

```bash
bun run test
```

Run in watch mode:

```bash
bun run test:watch
```

## Roadmap

- Optional one-shot CLI flags to override usage config values per run
- Richer output formats and filters
- Additional providers after MVP hardening
- Release automation (tags/changelog)

## Contributing

Issues and PRs are welcome.  
Before sending changes:

```bash
bun run test
```
