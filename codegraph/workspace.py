from __future__ import annotations

import hashlib
import os
import subprocess
import sys
from pathlib import Path


class WorkspaceError(RuntimeError):
    pass


class Workspace:
    def __init__(self, root: Path):
        self.root = root.resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def resolve(self, relative: str) -> Path:
        candidate = (self.root / relative).resolve()
        if candidate != self.root and self.root not in candidate.parents:
            raise WorkspaceError("Path escapes the project workspace")
        return candidate

    def write(self, relative: str, content: str) -> Path:
        target = self.resolve(relative)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return target

    def inventory(self) -> list[dict[str, object]]:
        files: list[dict[str, object]] = []
        for path in sorted(self.root.rglob("*")):
            if not path.is_file() or any(part in {".git", "__pycache__"} for part in path.parts):
                continue
            content = path.read_bytes()
            files.append({
                "path": str(path.relative_to(self.root)), "size": len(content),
                "sha256": hashlib.sha256(content).hexdigest(),
            })
        return files

    def validate(self) -> tuple[bool, str]:
        python_files = [p for p in self.root.rglob("*.py") if "__pycache__" not in p.parts]
        try:
            for path in python_files:
                compile(path.read_text(encoding="utf-8"), str(path), "exec")
        except (SyntaxError, UnicodeDecodeError) as exc:
            return False, f"Syntax check failed: {exc}"
        test_dir = self.root / "tests"
        if test_dir.exists():
            completed = subprocess.run(
                [sys.executable, "-m", "unittest", "discover", "-s", str(test_dir), "-v"],
                cwd=self.root, capture_output=True, text=True, timeout=30,
                env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
            )
            output = (completed.stdout + completed.stderr).strip()
            return completed.returncode == 0, output[-4000:]
        return True, f"Syntax check passed for {len(python_files)} Python files; no tests directory found."

