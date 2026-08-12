#!/usr/bin/env python3
"""Local static file server for development with caching disabled.

Plain `python -m http.server` sends no Cache-Control headers, so browsers
apply heuristic caching and can serve stale HTML/CSS/JS after edits. This
wrapper disables that so every reload reflects the current files on disk.
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    http.server.test(HandlerClass=NoCacheHandler, port=port)
