import os
exec(open('/home/claude/play/lib.py').read())
start(); pg.wait_for_timeout(2500)
for i in range(25): pg.mouse.wheel(0,400); pg.wait_for_timeout(60)
pg.mouse.move(800,450)
for i in range(25): pg.mouse.wheel(0,400); pg.wait_for_timeout(60)
pg.wait_for_timeout(800); shot(os.environ.get('P','d')+'_zoomout')
pg.mouse.move(800,450); pg.mouse.down(); pg.mouse.move(1300,700,steps=10); pg.mouse.up(); pg.wait_for_timeout(500); shot(os.environ.get('P','d')+'_zoomdrag')
