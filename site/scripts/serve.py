"""Local preview: python3 site/scripts/serve.py  →  http://127.0.0.1:4340/site/styleguide.html

Serves the repo root (the sheet uses ../icons) with caching off, so edits always show."""

import functools
import http.server
from pathlib import Path


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    handler = functools.partial(NoCache, directory=str(root))
    print('http://127.0.0.1:4340/site/styleguide.html')
    http.server.ThreadingHTTPServer(('127.0.0.1', 4340), handler).serve_forever()
