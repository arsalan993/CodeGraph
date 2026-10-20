from __future__ import annotations

import re


MODULES = [
    ("source", "Data source", "data", "Fetch and normalize records from an external source."),
    ("storage", "Storage", "data", "Persist normalized data for repeatable analysis."),
    ("kpi", "KPI engine", "logic", "Calculate documented metrics from stored records."),
    ("api", "Backend API", "backend", "Expose health, records, and KPI endpoints."),
    ("dashboard", "Dashboard", "frontend", "Present metrics and operational status."),
]


def slugify(value: str) -> str:
    words = re.findall(r"[a-z0-9]+", value.lower())[:6]
    return "-".join(words) or "codegraph-project"


def project_name(prompt: str) -> str:
    compact = " ".join(prompt.split())
    if len(compact) > 52:
        compact = compact[:49].rstrip() + "…"
    return compact[0].upper() + compact[1:] if compact else "New project"


def plan(prompt: str) -> dict:
    modules = []
    positions = [(110, 130), (330, 70), (330, 230), (560, 150), (790, 150)]
    for index, (key, name, kind, description) in enumerate(MODULES):
        modules.append({"key": key, "name": name, "kind": kind, "description": description,
                        "x": positions[index][0], "y": positions[index][1]})
    return {
        "name": project_name(prompt), "slug": slugify(prompt), "prompt": prompt,
        "modules": modules,
        "dependencies": [("source", "storage"), ("storage", "kpi"), ("kpi", "api"), ("api", "dashboard")],
        "acceptance": [
            "Data can be loaded without paid services", "KPIs are calculated from stored records",
            "API returns JSON", "Dashboard presents the KPI summary", "Automated checks pass",
        ],
    }

