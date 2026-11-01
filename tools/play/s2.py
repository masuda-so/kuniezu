pg.get_by_text('はじめる').click(); pg.wait_for_timeout(800)
pg.get_by_text('桶狭間前夜').click(); pg.wait_for_timeout(1200); shot('03_scen')
print(txt()[:2500])
