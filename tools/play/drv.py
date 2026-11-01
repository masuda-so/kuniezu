"""既存サーバーに接続して検証する。サーバーは自動起動しない。"""
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

PLAY_DIR = Path(__file__).resolve().parent
OUT_DIR = Path(os.environ.get('GAME_TEST_OUTPUT', PLAY_DIR / 'artifacts'))
BASE_URL = os.environ.get('GAME_URL', 'http://localhost:8000/index.html')
OUT_DIR.mkdir(parents=True, exist_ok=True)
errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1400, 'height': 860})
    pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(f'[{m.type}] {m.text}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE_URL)
    pg.wait_for_timeout(1500)

    def shot(name):
        pg.screenshot(path=str(OUT_DIR / f'{name}.png'))

    def txt(sel='body'):
        return pg.locator(sel).inner_text() if pg.locator(sel).count() else ''

    script = Path(sys.argv[1])
    if not script.exists():
        script = PLAY_DIR / sys.argv[1]
    try:
        exec(compile(script.read_text(), str(script), 'exec'))
    finally:
        b.close()
    print('ERRORS:\n' + ('\n'.join(errs) or 'none'))
    if errs:
        raise SystemExit(1)
