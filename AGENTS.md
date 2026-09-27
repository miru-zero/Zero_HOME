# Repository Guidelines

## Project Structure & Module Organization

`source/` contains production code organized by runtime boundary: `core/zero-core` owns the public MCP/Core server, `agent/zero-agent` owns paired machine execution, `providers/` owns provider implementations, `packages/` owns shared contracts/utilities, and `apps/` is reserved for ChatGPT-facing app-plugin connector documentation. Unit tests live beside their modules in `test/` directories. `sandbox/` is reserved for temporary experiments, packaged artifacts, failed runs, and scratch files; do not place production code there. `.zero/` contains workspace metadata and configuration. `logs/` contains local runtime logs and is ignored.

## Build, Test, and Development Commands

Run commands from the module directory you are changing:

```powershell
cd source/core/zero-core; npm test
cd source/agent/zero-agent; npm test
node --test source/providers/command/test/*.test.js
node --test source/providers/devices/test/*.test.js
cd source/core/zero-core; npm start
cd source/agent/zero-agent; npm start
```

`npm test` uses Node's built-in test runner. `npm start` launches the selected service. The agent also provides `npm run doctor` for local diagnostics. Use Node.js 20+.

## Coding Style & Naming Conventions

The modules use CommonJS JavaScript (`"type": "commonjs"`) with two-space indentation and semicolon-terminated statements. Keep files focused by responsibility. Use kebab-case for directory names, descriptive camelCase for variables and functions, and PascalCase for classes. In Zero `src` code, prefer object modules with `Object.assign(exports, name)` and avoid adding `module.exports = ...`.

## Testing Guidelines

Add tests under the module's existing `test/` directory and name them `*.test.js`. Prefer focused Node test cases that cover success paths, validation, and failure handling. Run the narrowest affected module test first, then run broader tests when practical. No coverage threshold is currently defined.

## Commit & Pull Request Guidelines

Use concise imperative commit subjects, keep each commit focused, and describe behavior changes in the body when needed. Pull requests should explain the affected module, list validation commands and results, call out configuration changes, and include logs or screenshots only when they clarify runtime behavior.

## Security & Configuration Tips

Never commit credentials, tokens, device secrets, or personal data. Keep experiments and generated artifacts under `sandbox/`. Review `.zero/` changes carefully because they affect workspace behavior, and verify paths before changing runtime or device configuration.
