from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from dataclasses import dataclass


class ProviderError(RuntimeError):
    pass


@dataclass
class ProviderResult:
    content: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0


class DemoProvider:
    name = "demo"

    def complete(self, system: str, prompt: str) -> ProviderResult:
        return ProviderResult(
            content="Demo provider acknowledged the task. Deterministic builders will create and validate the portfolio artifact.",
            model="codegraph-demo",
        )


class GroqProvider:
    name = "groq"
    endpoint = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(self) -> None:
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = os.getenv("GROQ_MODEL", "qwen/qwen3-32b")
        if not self.api_key:
            raise ProviderError("GROQ_API_KEY is not configured")

    def complete(self, system: str, prompt: str) -> ProviderResult:
        payload = json.dumps({
            "model": self.model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "temperature": 0.2,
        }).encode()
        request = urllib.request.Request(
            self.endpoint, data=payload,
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                data = json.loads(response.read())
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as exc:
            raise ProviderError(f"Groq request failed: {exc}") from exc
        usage = data.get("usage", {})
        return ProviderResult(
            content=data["choices"][0]["message"]["content"], model=data.get("model", self.model),
            input_tokens=usage.get("prompt_tokens", 0), output_tokens=usage.get("completion_tokens", 0),
        )


def get_provider():
    provider = os.getenv("CODEGRAPH_PROVIDER", "demo").lower()
    if provider == "groq":
        return GroqProvider()
    return DemoProvider()

