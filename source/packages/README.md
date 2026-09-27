# Packages Layer

`source/packages` contains shared contracts and utilities used by runtime layers.

## Packages

| Package | Purpose |
| --- | --- |
| `packages/zero` | Shared Zero contract version, tool IDs, descriptors, runtime conventions |
| `packages/common` | Transitional shared utilities for HTTP/config/server helpers |

## Rule

Shared packages define contracts and helpers. They should not own product runtime behavior that belongs in Core, Agent, or Providers.

## Current dependency direction

```text
Core/Providers/Agent → packages/zero
legacy/transition services → packages/common
```

Do not introduce dependencies from packages back into Core/Agent runtime modules unless explicitly designed.
