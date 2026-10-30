#!/usr/bin/env python3
"""Generate a public-only calendar snapshot. No GitHub token is used or needed."""

import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
URL = "https://github.com/users/zecloud/contributions"


class CalendarParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.days = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "data-date" not in attrs or "data-level" not in attrs:
            return
        date = dt.date.fromisoformat(attrs["data-date"])
        level = int(attrs["data-level"])
        if not 0 <= level <= 4 or date.isoformat() in self.days:
            raise ValueError("Invalid or duplicate contribution day")
        self.days[date.isoformat()] = level


def build_snapshot(html, now=None):
    parser = CalendarParser()
    parser.feed(html)
    days = [{"date": date, "level": level} for date, level in sorted(parser.days.items())]
    if not 364 <= len(days) <= 371:
        raise ValueError(f"Expected a full contribution year, got {len(days)} days")
    for previous, current in zip(days, days[1:]):
        if dt.date.fromisoformat(current["date"]) - dt.date.fromisoformat(previous["date"]) != dt.timedelta(days=1):
            raise ValueError("Contribution dates are not consecutive")
    now = now or dt.datetime.now(dt.timezone.utc)
    last = dt.date.fromisoformat(days[-1]["date"])
    if not 0 <= (now.date() - last).days <= 2:
        raise ValueError("GitHub returned an outdated or future contribution calendar")
    return {
        "username": "zecloud",
        "source": URL,
        "generatedAt": now.isoformat(),
        "days": days,
    }


def main():
    request = urllib.request.Request(URL, headers={"User-Agent": "ZeCloud-contribution-snapshot", "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=30) as response:
        snapshot = build_snapshot(response.read().decode("utf-8"))
    destination = ROOT / "contributions.json"
    temporary = destination.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(snapshot, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
    temporary.replace(destination)
    print(f"Saved {len(snapshot['days'])} public contribution days.")


if __name__ == "__main__":
    main()
