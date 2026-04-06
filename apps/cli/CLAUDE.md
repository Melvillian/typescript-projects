# CLI

## Overview

Command-line tool built with Commander.js. Uses workspace packages `common-lib` and `openai-summarizer`.

## Commands

- `bun run build` - Compile TypeScript
- `bun run dev` - Watch mode compilation
- `bun run typecheck` - Type check without emitting
- `bun run start` - Run CLI via `bun bin/cli.js`
- `bun run build:single` - Compile to standalone binary

## Dependencies

<!-- AUTO-GENERATED - DO NOT EDIT -->

- **@melvillian/common-lib** (workspace) - Shared utilities
- **@melvillian/openai-summarizer** (workspace) - OpenAI integration
- **commander** (^14.0.2) - CLI argument parsing
- **date-fns** (^4.1.0) - Date utilities
- **wellcrafted** (^0.23.1) - Rust-style error definitions and handling to make Typescript errors more robust. Use this when it makes sense to declare user-defined errors

## Auto-Update Instructions

After changes to files in this directory, run `/update-claude-md`.
