pg.get_by_text('はじめる').click(); pg.wait_for_timeout(800)
pg.get_by_text('桶狭間前夜').click(); pg.wait_for_timeout(1000)
pg.get_by_text('織田家で見守る').click(); pg.wait_for_timeout(2000); shot('04_game')
print(txt()[:3000])
