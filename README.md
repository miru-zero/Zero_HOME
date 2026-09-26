<!-- fullWidth: false tocVisible: true tableWrap: true -->
# Zero_HOME

Central workspace for Zero Platform.

Zero_HOME separates source code, runtime data, sandbox experiments, and workspace metadata.

## Structure

```
Zero_HOME
├── source
├── runtime
├── sandbox
├── docs
├── logs
├── cache
└── .zero
```

## Source

`source` contains version-controlled code only.

```
source
├── apps
├── packages
├── providers
├── core
└── agent
```

## Zero Core

Location:

```
source/core/zero-core
```

Role:
- Central orchestration server
- Provider routing
- MCP interface
- Device/task management

## Zero Agent

Location:

```
source/agent/zero-agent
```

Role:
- Runs on target machines
- Executes local capabilities
- Returns task results

## Providers

Current migrated providers:

```
source/providers
├── command
└── devices
```

## Runtime

Runtime data is separated from source:

```
runtime
├── state
├── logs
├── cache
└── browser-profile
```

## Sandbox

Temporary experiments and tests:

```
sandbox
├── tmp
├── experiments
└── failed-runs
```

## Migration Rule

Copy first, verify, then switch paths.

Never mix source with runtime or temporary artifacts.

## Test and Sandbox Design

Zero separates production source from validation work.

Source directories should contain:

```
src/
package.json
production configuration
```

Test experiments should not be mixed into every source module.

Recommended validation layout:

```
sandbox
└── tests
    ├── core
    │   └── zero-core
    ├── agent
    │   └── zero-agent
    ├── providers
    │   ├── command
    │   └── devices
    ├── packages
    │   └── common
    └── apps
        ├── gateway
        └── mcp
```
