"""Small in-process Prometheus-compatible metrics registry."""

from __future__ import annotations

from collections import defaultdict
from threading import Lock

_counters: dict[tuple[str, tuple[tuple[str, str], ...]], float] = defaultdict(float)
_lock = Lock()


def increment(name: str, value: float = 1, **labels: str) -> None:
    key = (name, tuple(sorted((str(k), str(v)) for k, v in labels.items())))
    with _lock:
        _counters[key] += value


def render(extra_metrics: dict[str, float] | None = None) -> str:
    with _lock:
        rows = list(_counters.items())
    lines = ["# HELP nexora_operational_metrics Lightweight Nexora operational counters", "# TYPE nexora_operational_metrics counter"]
    for (name, labels), value in sorted(rows):
        suffix = ""
        if labels:
            encoded = ",".join(f'{key}="{value.replace(chr(34), chr(92) + chr(34))}"' for key, value in labels)
            suffix = "{" + encoded + "}"
        lines.append(f"nexora_{name}{suffix} {value}")
    for name, value in sorted((extra_metrics or {}).items()):
        lines.append(f"nexora_{name} {value}")
    return "\n".join(lines) + "\n"
