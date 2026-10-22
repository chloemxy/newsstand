"""Local dev server that turns off browser caching, so edits always show.

    python serve.py          # http://localhost:4517
    python serve.py 8000     # another port
"""
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4517
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCache, directory=root)
    print(f"Serving {root} at http://localhost:{port}", flush=True)
    http.server.ThreadingHTTPServer(("", port), handler).serve_forever()
