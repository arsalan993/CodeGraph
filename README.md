# CodeGraph

> A local, graph based multi-agent development workspace for portfolio and open source experimentation.

CodeGraph is a local, graph based multi-agent development workspace. A project lead turns a request into modules, module coordinators manage coding and testing agents, and the dashboard shows their lifecycle, files, shared memory, dependencies, and validation results.

This repository contains a working portfolio MVP. Its built-in demo provider produces a deterministic data and KPI application, so the complete workflow runs without an API key. A Groq adapter is included for future model-driven planning and implementation.

## Run it

Requirements: Python 3.9 or newer. No package installation is required.

```bash
python3 -m codegraph.server
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765). Create a project, review its graph, then select **Run agents**. Generated applications are written under `workspaces/<project-id>/`.

To use Groq, copy `.env.example` values into your shell environment before starting:

```bash
export CODEGRAPH_PROVIDER=groq
export GROQ_API_KEY=your_key_here
export GROQ_MODEL=qwen/qwen3-32b
python3 -m codegraph.server
```

The current Groq adapter records the planning call. Deterministic builders still create files so outputs remain safely scoped and testable. Model-generated patch tools are the next implementation milestone.

## What works

- Natural language project creation and five-module dependency graph
- Main, module coordinator, coding, and testing agent lifecycles
- Separate module and agent graph views
- SQLite shared memory, event history, projects, runs, and workspace registry
- Scoped per-project workspaces with path escape protection
- File ownership, sizes, and SHA-256 tracking
- Python syntax compilation and generated unit-test execution
- Run cancellation and failure recording
- Demo provider and configurable Groq API adapter
- Responsive dashboard with live polling, inspection, files, and memory

## Architecture

```text
Browser dashboard
       │ JSON API / polling
Python HTTP server
       ├── Planner → module graph
       ├── Orchestrator → agent lifecycle
       ├── Provider adapter → demo / Groq
       ├── Validation gate → compile + tests
       ├── Workspace registry → paths + hashes + ownership
       └── SQLite → projects, memory, events, runs
```

The model never writes directly to disk. The orchestration layer owns tools, validates workspace paths, records file changes, and runs the validation gate.

## Test it

```bash
python3 -m unittest discover -s tests -v
```

The tests verify graph creation, an end-to-end agent run, generated files, validation evidence, and workspace boundary enforcement.

## MVP boundaries

The running version demonstrates the complete orchestration loop with deterministic project builders. It supports one generated Python application pattern and processes modules sequentially. Before exposing it as a hosted service, add container isolation, authentication, resource limits, and model patch schemas. See [the feature draft](docs/feature-draft.md) for the broader product plan.

## Contributing

Issues and pull requests are welcome. Keep changes focused, document behavior changes, and run the test suite before opening a pull request.

## License

CodeGraph is released under the [MIT License](LICENSE).

