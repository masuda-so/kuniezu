import json
import shutil
import subprocess
from pathlib import Path

from django.conf import settings

from kuniezu.history.dates import jd_to_western
from kuniezu.history.dates import western_to_jd


def test_game_calendar_matches_history_db_for_every_supported_day() -> None:
    script = Path(settings.BASE_DIR) / "kuniezu/static/kuniezu/calendar.js"
    first = western_to_jd(1532, 1, 1)
    last = western_to_jd(1623, 12, 31)
    node = shutil.which("node")
    assert node is not None
    # No shell; all arguments are repository-owned source and numeric bounds.
    result = subprocess.run(  # noqa: S603
        [
            node,
            "-e",
            (
                "const fs=require('node:fs'),vm=require('node:vm');"
                "const c=vm.createContext({});c.window=c;"
                "vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);"
                "const rows=[];for(let jd=+process.argv[2];jd<=+process.argv[3];jd++){"
                "const {y,m,d}=c.TKCalendar.fromJD(jd);"
                "rows.push([jd,y,m,d,c.TKCalendar.toJD(y,m,d)]);}"
                "process.stdout.write(JSON.stringify(rows));"
            ),
            str(script),
            str(first),
            str(last),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    rows = json.loads(result.stdout)
    assert len(rows) == last - first + 1
    for expected, row in enumerate(rows, first):
        jd, year, month, day, reverse = row
        assert jd == expected
        assert (year, month, day) == jd_to_western(jd)
        assert reverse == western_to_jd(year, month, day) == jd
