# CLAUDE.md

## Overview

TypeScript monorepo using Bun workspaces. Executable programs with entrypoints are in the (`apps/*`) directory and shared importable packages of functionality are in the (`packages/*`) directory. Node >=22 required.

## Commands

- `bun run build` - Build all packages and apps
- `bun run start` / `bun run start:cli` - Run CLI app
- `bun run start:api` - Run API app
- `bun run test` - Run tests (vitest)
- `bun run test:watch` - Run tests in watch mode
- `bun run lint` - Lint and fix (eslint)
- `bun run lint:check` - Lint check only
- `bun run typecheck` - Typecheck all packages
- `bun run format` - Format code (prettier)
- `bun run clean` - Remove dist dirs
- `bun run clean:all` - Remove dist + node_modules

## Render

- When using the Render MCP, always select this workspace first using `select_workspace` with id `tea-cspvkb8gph6c73ft0hd0`
