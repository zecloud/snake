from html.parser import HTMLParser
from pathlib import Path
import unittest
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://www.zecloud.fr/snake/"


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        for attr in ("src", "href"):
            if attr in attrs:
                self.urls.append(attrs[attr])


class ProjectPathsTests(unittest.TestCase):
    def test_assets_resolve_under_project_path(self):
        links = Links()
        links.feed((ROOT / "index.html").read_text())
        local = [url for url in links.urls if not url.startswith(("https://", "#"))]
        self.assertTrue(local)
        for url in local:
            with self.subTest(url=url):
                self.assertTrue(urlparse(urljoin(BASE, url)).path.startswith("/snake/"))
                self.assertTrue((ROOT / url).is_file())
        self.assertNotIn('fetch("/', (ROOT / "app.js").read_text())
        self.assertIn('fetch("./contributions.json"', (ROOT / "app.js").read_text())
        self.assertFalse((ROOT / "CNAME").exists())

    def test_only_standalone_assets_are_deployed(self):
        workflow = (ROOT / ".github/workflows/pages.yml").read_text()
        self.assertIn("cp index.html style.css app.js engine.mjs contributions.json _site/", workflow)
        self.assertIn("branches: [main]", workflow)
        self.assertNotIn("pull_request_target", workflow)


if __name__ == "__main__":
    unittest.main()
