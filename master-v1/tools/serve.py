"""Local dev server for the whole BuildCraft repo, with caching turned off.

ES modules need http:// (not file://), and browsers cache them hard, so edits
can look like they did nothing. This server sends no-store on every file.

Run from anywhere:  python3 master-v1/tools/serve.py [port]
Then open:          http://127.0.0.1:8765/master-v1/
"""

import functools
import http.server
import pathlib
import sys

REPO_ROOT = pathlib.Path(__file__).resolve().parents[2]


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    handler = functools.partial(NoCacheHandler, directory=str(REPO_ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Serving {REPO_ROOT} at http://127.0.0.1:{port}/master-v1/")
        httpd.serve_forever()


if __name__ == "__main__":
    main()
