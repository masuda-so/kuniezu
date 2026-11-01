exec(open('/home/claude/play/lib.py').read())
start()
run(60, tag='div', pick=1, every=15)
print(txt('#chron')[:2500]); print(txt('#me'))
