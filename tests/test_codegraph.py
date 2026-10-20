import tempfile
import time
import unittest
from pathlib import Path

from codegraph.database import Database
from codegraph.orchestrator import Orchestrator
from codegraph.workspace import Workspace, WorkspaceError


class CodeGraphTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        root = Path(self.temp.name)
        self.engine = Orchestrator(Database(root / "test.db"), root / "workspaces")

    def tearDown(self):
        self.temp.cleanup()

    def test_creates_project_graph_and_memory(self):
        project = self.engine.create_project("Build a free data KPI dashboard with an API")
        self.assertEqual(project["status"], "planned")
        self.assertEqual(len(project["modules"]), 5)
        self.assertEqual(len(project["dependencies"]), 4)
        self.assertEqual(project["agents"][0]["role"], "main")
        self.assertEqual(project["memories"][0]["category"], "requirements")

    def test_demo_run_generates_files_and_passes_validation(self):
        project = self.engine.create_project("Build a free data KPI dashboard with an API")
        run = self.engine.start(project["id"])
        deadline = time.time() + 15
        while time.time() < deadline:
            current = self.engine.project(project["id"])
            current_run = next(item for item in current["runs"] if item["id"] == run["id"])
            if current_run["status"] not in {"queued", "running"}:
                break
            time.sleep(0.1)
        self.assertEqual(current_run["status"], "completed")
        self.assertGreaterEqual(len(current["files"]), 8)
        self.assertTrue(all(module["status"] == "completed" for module in current["modules"]))
        self.assertTrue(any(event["type"] == "validation.passed" for event in current["events"]))

    def test_workspace_rejects_escape(self):
        workspace = Workspace(Path(self.temp.name) / "safe")
        with self.assertRaises(WorkspaceError):
            workspace.write("../outside.txt", "blocked")


if __name__ == "__main__":
    unittest.main()

