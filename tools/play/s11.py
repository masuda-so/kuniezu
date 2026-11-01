exec(open('/home/claude/play/lib.py').read())
start()
for name in ['同盟図','外交','メニュー']:
  pg.locator('#me button').filter(has_text=name).first.click();pg.wait_for_timeout(900)
  shot('ui_'+name); print('==',name); print((modal() or txt('#drawer') or txt('body'))[:900]); 
  pg.keyboard.press('Escape');pg.wait_for_timeout(300)
  if modal():
    try: pg.locator('#modal button').filter(has_text='×').first.click()
    except: pg.locator('#modal .close, #modal button').first.click()
  pg.wait_for_timeout(300)
  if name=='同盟図': pg.locator('#me button').filter(has_text=name).first.click();pg.wait_for_timeout(300)
