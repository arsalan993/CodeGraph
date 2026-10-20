from __future__ import annotations

import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .database import Database
from .orchestrator import Orchestrator


ROOT = Path(__file__).parents[1]
PUBLIC = ROOT / "public"
DB = Database(ROOT / "data" / "codegraph.db")
ENGINE = Orchestrator(DB, ROOT / "workspaces")


class Handler(BaseHTTPRequestHandler):
    server_version = "CodeGraph/0.1"

    def log_message(self, format: str, *args) -> None:
        print(f"[CodeGraph] {format % args}")

    def json(self, status: int, payload) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length > 1_000_000:
            raise ValueError("Request body too large")
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            self.json(200, {"status": "ok", "provider": os.getenv("CODEGRAPH_PROVIDER", "demo")})
            return
        if path == "/api/projects":
            self.json(200, ENGINE.list_projects())
            return
        if path.startswith("/api/projects/"):
            project_id = path.split("/")[3]
            try: self.json(200, ENGINE.project(project_id))
            except KeyError as exc: self.json(404, {"error": str(exc)})
            return
        self.static(path)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        try:
            if path == "/api/projects":
                prompt = str(self.body().get("prompt", "")).strip()
                if len(prompt) < 12:
                    self.json(400, {"error": "Describe the project in at least 12 characters"}); return
                self.json(201, ENGINE.create_project(prompt)); return
            parts = path.strip("/").split("/")
            if len(parts) == 4 and parts[:2] == ["api", "projects"] and parts[3] == "runs":
                self.json(202, ENGINE.start(parts[2])); return
            if len(parts) == 6 and parts[:2] == ["api", "projects"] and parts[3] == "runs" and parts[5] == "cancel":
                ENGINE.cancel(parts[2], parts[4]); self.json(202, {"status": "cancellation_requested"}); return
            self.json(404, {"error": "Route not found"})
        except KeyError as exc:
            self.json(404, {"error": str(exc)})
        except (ValueError, json.JSONDecodeError) as exc:
            self.json(400, {"error": str(exc)})
        except Exception as exc:
            self.json(500, {"error": str(exc)})

    def static(self, path: str) -> None:
        relative = "index.html" if path == "/" else path.lstrip("/")
        target = (PUBLIC / relative).resolve()
        if PUBLIC.resolve() not in target.parents and target != PUBLIC.resolve():
            self.send_error(403); return
        if not target.is_file():
            target = PUBLIC / "index.html"
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def run() -> None:
    host = os.getenv("CODEGRAPH_HOST", "127.0.0.1")
    port = int(os.getenv("CODEGRAPH_PORT", "8765"))
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"CodeGraph running at http://{host}:{port}")
    try: server.serve_forever()
    except KeyboardInterrupt: pass
    finally: server.server_close()


if __name__ == "__main__":
    run()

