"""Count, for every person and castle, how far the history database covers it."""

import json
from typing import Any

from django.core.management.base import BaseCommand
from django.core.management.base import CommandParser

from kuniezu.history.inventory import STATES
from kuniezu.history.inventory import inventory

LABELS = {
    "confirmed": "確定",
    "comparison": "比較値だけ",
    "undetermined": "決まらない",
    "untouched": "未着手",
    "birth": "生年",
    "death": "没年",
    "whereabouts": "所在",
    "built": "築城",
    "ended": "消滅",
    "owner": "持ち主",
    "lord": "城主",
}


class Command(BaseCommand):
    help = (
        "人物と城ごとに、史実 DB の記録の状態"
        "（確定・比較値だけ・決まらない・未着手）を数える"
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--rows", action="store_true", help="人物と城の 1 件ずつの状態も出す"
        )
        parser.add_argument(
            "--markdown", action="store_true", help="数の表を Markdown で出す"
        )

    def handle(self, *args: Any, **options: Any) -> None:
        result = inventory()
        if options["markdown"]:
            self.stdout.write(markdown(result))
            return
        if not options["rows"]:
            result.pop("rows")
        self.stdout.write(json.dumps(result, ensure_ascii=False, indent=1))


def markdown(result: dict[str, Any]) -> str:
    lines = []
    for group, title in (("people", "人物"), ("castles", "城")):
        part = result[group]
        lines += [
            f"{title}（全体 {part['total']}）",
            "",
            "| 記録 | " + " | ".join(LABELS[s] for s in STATES) + " |",
            "|---|" + "---:|" * len(STATES),
        ]
        for field, counts in part["states"].items():
            cells = " | ".join(str(counts[s]) for s in STATES)
            lines.append(f"| {LABELS[field]} | {cells} |")
        lines.append("")
    return "\n".join(lines)
