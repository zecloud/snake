import datetime as dt
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("contributions", Path(__file__).resolve().parents[1] / "scripts/update-contributions.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
NOW = dt.datetime(2026, 10, 29, tzinfo=dt.timezone.utc)


def calendar(count=365):
    return "".join(
        f'<td data-date="{(NOW.date() - dt.timedelta(days=count - 1 - i)).isoformat()}" data-level="{i % 5}"></td>'
        for i in range(count)
    )


class ContributionsTests(unittest.TestCase):
    def test_extracts_only_public_levels_and_dates(self):
        snapshot = module.build_snapshot(calendar(), NOW)
        self.assertEqual(len(snapshot["days"]), 365)
        self.assertEqual(snapshot["username"], "zecloud")
        self.assertEqual(set(snapshot["days"][0]), {"date", "level"})

    def test_rejects_missing_invalid_and_duplicate_dates(self):
        for html in ["<p>Sign in</p>", calendar(363), calendar() + calendar(1), calendar().replace('data-level="0"', 'data-level="9"', 1)]:
            with self.subTest(html=html[:100]), self.assertRaises(ValueError):
                module.build_snapshot(html, NOW)

    def test_rejects_stale_response(self):
        with self.assertRaises(ValueError):
            module.build_snapshot(calendar(), NOW + dt.timedelta(days=10))


if __name__ == "__main__":
    unittest.main()
