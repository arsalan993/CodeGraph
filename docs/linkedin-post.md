# I built CodeGraph, an experiment in graph based multi-agent development

What if you could see an AI software project as a living map instead of a long chat history?

I have been exploring that idea through CodeGraph, an experimental portfolio project.

A user describes an application. CodeGraph turns the request into connected modules, assigns a main project agent, and creates specialist agents for coding and testing. The dashboard shows how the system grows, which agent owns each task, what files changed, and whether validation passed.

The current local MVP includes:

- Interactive module and agent graphs
- Main, module coordinator, coding, and testing roles
- Shared project memory and an event history
- File ownership with content hashes
- Syntax checks and automated test execution
- A demo provider that works without a paid model API
- Optional Groq integration for model calls

The demo builds a small data application that imports records, calculates KPIs, exposes an API, and produces a dashboard.

This remains an experiment and a portfolio project. It supports a focused workflow rather than general autonomous software development. My next step is to replace the deterministic builders with constrained model-generated patches while keeping the validation and workspace controls in charge.

Source code: {{GITHUB_URL}}

#SoftwareEngineering #AIEngineering #MultiAgentSystems #Python #PortfolioProject

