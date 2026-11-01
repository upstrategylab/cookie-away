"""Local preview: python3 site/scripts/serve.py  →  http://127.0.0.1:4340/

Serves site/ as the root (like Vercel does) with caching off, so edits always show.
Clean URLs: /styleguide and /benchmarks map to their .html files."""

import functools
import http.server
from pathlib import Path


class NoCache(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split('?')[0]
        if '.' not in path.rsplit('/', 1)[-1] and path != '/' and (Path(self.directory) / (path.lstrip('/') + '.html')).exists():
            self.path = path + '.html'
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[1]
    handler = functools.partial(NoCache, directory=str(root))
    print('http://127.0.0.1:4340/')
    http.server.ThreadingHTTPServer(('127.0.0.1', 4340), handler).serve_forever()
