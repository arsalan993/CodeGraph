# CodeGraph — feature and architecture draft

Status: initial planning draft, updated 19 October 2026. Proposed scope, not an implementation guarantee.

## Product purpose

CodeGraph is a graph based development workspace. A user describes an application, a main project agent plans its modules, module coordinators manage their work, and specialist agents implement and test it. A dashboard shows the application structure, dependencies, agent activity, and results. The initial target is small portfolio applications using one supported stack.

Example request: build an application that imports data from a free source, transforms it, calculates KPIs, and displays a dashboard.

## Proposed execution approach

Start as a local application: a browser dashboard connects to a backend running on the user's computer. The backend creates a separate workspace folder for each generated project and manages file access, model calls, agent scheduling, and command execution. The language model proposes actions; the backend tools perform them and return results. An IDE integration is optional because files can be opened in any editor.

Keep CodeGraph's source and state separate from generated project folders. Each project has a registered root path, a Git repository, and a project identifier. File operations must stay within the assigned project root. Run generated code and tests in an isolated runner, preferably a container with explicit resource and execution limits.

Initially distribute the source with a documented local start command. Package it as a desktop application only after the core workflow works. A public portfolio dashboard can use recorded or simulated runs; a hosted live runner would require additional execution isolation and operating costs.

## Feature requirements

### 1. Project creation

- Accept a natural language request.
- Produce an editable brief, requirements, proposed modules, dependencies, and acceptance criteria.
- Let the user review the plan before development begins.
- Create or select a project workspace.

### 2. Project graph

- Display modules, tasks, and dependency connections.
- Example modules: ingestion, storage, transformation, KPI calculations, backend API, frontend dashboard.
- Selecting a module shows its responsibilities, files, tasks, agents, dependencies, and status.
- Provide pan, zoom, search, filtering, expand, and collapse.
- Distinguish visual collapse from archiving or removing a module.

### 3. Main project agent

- Decompose requirements and assign tasks to module coordinators.
- Define shared interfaces and coordinate changes affecting multiple modules.
- Track blockers, review results, and report progress.
- Follow plan → assign → implement → validate → test → review.

### 4. Agent roles

| Role | Responsibility | Initial scope |
| --- | --- | --- |
| Main project agent | Overall planning and coordination | Core |
| Module coordinator | Module responsibilities, task assignment, and acceptance | Core |
| Coding agent | Create and modify implementation | Core |
| Testing agent | Write and execute tests; report failures and verify fixes | Core |
| Review agent | Inspect requirements, contracts, and code quality | Optional next step |
| Integration agent | Check interactions between connected modules | Later |

Implement roles through a shared agent engine with different instructions and tools. Agents activate for assigned work rather than staying continuously active. Planning and documentation initially belong to the main agent and module coordinators.

### 5. Shared memory

- Store requirements, module responsibilities, decisions, interface contracts, schemas, task state, test results, and known issues.
- Give each agent a project summary and relevant module context.
- Record the author, timestamp, and version of updates.
- Route shared contract changes through the main agent.
- Start with structured database records and Markdown; advanced retrieval is optional.

### 6. Validation gate (the proposed filter)

Place a validation gate after each coding change and before the module is accepted. Use actual development tools to check code rather than relying on another model's opinion.

1. Check that returned tool actions or patches have a valid structure and target allowed files.
2. Apply changes in the task workspace.
3. Run the supported stack's syntax, lint, type, and build checks where applicable.
4. Have the testing agent add or update meaningful tests and execute them.
5. Return diagnostics, failed assertions, and relevant logs to the coding agent.
6. Retry within a fixed limit; otherwise mark the task blocked with an explanation.
7. Let the module coordinator accept the result once required checks pass.

A validation service runs these checks and records evidence. An optional review agent can interpret failures or inspect design quality. Passing compilation and tests does not prove every requirement is correct, so keep acceptance criteria and integration checks visible.

### 7. Workspace registry and file tracking

- Maintain a file tree and registry mapping paths to modules, owning agents, related tasks, and dependencies.
- Track file creation, modification, rename, and deletion through tool events and a filesystem watcher; reconcile on startup and before dispatching work.
- Store content hashes or Git change references to detect stale context.
- Let the main agent query the registry to find which coordinator owns affected files.
- Escalate shared or unowned files to the main agent for assignment.
- Keep the filesystem and Git as the source of truth; the registry is an index that can be rebuilt.
- Use folder ownership first. Deeper function and symbol indexing can come later.

### 8. Agent lifecycle dashboard

- Show created, queued, running, paused, completed, failed, cancelled, and deleted agents.
- Display role, parent, module, task, duration, last activity, tool actions, changed files, test results, and available usage information.
- Preserve history when agents are deleted from active work.
- Support separate connected project and agent views to keep the graph readable.
- Display operational events and concise agent progress summaries.

### 9. Evolving graph

- New requests identify affected modules and propose added tasks or modules.
- Removed features can archive tasks and remove unused modules while retaining history.
- Changes to application structure are reviewed by the user.
- Example: scheduled refresh adds a scheduling module and updates ingestion and dashboard tasks.

### 10. User controls

- Edit requirements, module descriptions, and tasks.
- Start, pause, cancel, and retry runs.
- Inspect diffs, logs, and test output.
- Limit concurrent agents, model usage, and repair iterations.
- On cancellation, stop dispatching work and show the outcome of any action already in progress.

### 11. Coordinated changes

- Assign module folder ownership.
- Initially allow one coding agent per module at a time.
- Lock shared files or route their changes through the main agent.
- Run integration checks after related module changes are combined.
- Keep code changes associated with tasks and runs.

### 12. History and completion report

- Maintain a timeline of requests, plans, graph changes, decisions, runs, changes, and checks.
- At completion, report implemented features, passed and failed checks, unresolved issues, and remaining tasks.

## Model access and budget

Use a provider adapter so model providers and model IDs can change without changing orchestration. Configure credentials on the backend. Support an inexpensive or free hosted model first and a mock provider for development and reproducible demonstrations.

Groq (distinct from Grok) currently documents a free plan with model-specific rate limits. Gemini also documents free tiers for eligible models. Account availability and limits must be checked before choosing a model. Free access still normally requires an account and API key. No provider or coding quality is guaranteed by this draft.

Start with small tasks and low concurrency, record token usage when available, queue requests, respect rate-limit responses, and cap repair attempts. Assess a candidate model on a representative module before adopting it. More agents multiply requests; different roles can share one model.

Sources checked 19 October 2026:

- Groq limits: https://console.groq.com/docs/rate-limits
- Groq models: https://console.groq.com/docs/models
- Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing

## End-to-end workflow

User request → editable plan → project folder and module graph → file ownership registry → module tasks → coding → validation gate → testing and repair → module acceptance → integration checks → completion report.

All steps publish lifecycle events to the dashboard and persist relevant state. New feature requests repeat the workflow using the existing graph, files, and memory.

## Portfolio MVP

- One local project at a time and one supported application stack.
- Main agent, module coordinators, coding agents, and testing agents.
- Small fixed concurrency and bounded repair loops.
- Interactive module and agent views with live activity.
- Basic shared memory, workspace registry, folder ownership, and Git history.
- Automated validation, test evidence, and final report.
- One configurable model provider plus a mock provider.
- Demonstration: build the data ingestion and KPI application, then request scheduled refresh and show the graph evolve.

## Deferred scope

Desktop packaging, IDE extensions, unrestricted nesting of agents, many supported stacks, hosted multi-user execution, advanced semantic code indexing, automatic conflict resolution, and dedicated review/integration agents.

## Decisions still to make

- Implementation stack for CodeGraph and the first generated application type.
- Supported model and its actual account limits.
- Workspace isolation and runner setup.
- Exact acceptance checks and concurrency limits.

Update this document as decisions are agreed. Record implementation milestones separately once development starts.
