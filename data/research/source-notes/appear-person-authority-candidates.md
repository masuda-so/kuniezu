# 年表の登場人物の典拠候補（未採用）

2026-11-09。最終の年表（訂正モジュールの適用後、`tools/checks/history-focus.cjs` のモデルの `TK.HIST`）の「登場」（`appear`）185 行の人物のうち、`data/research/curated/people` に典拠の無い 118 人を、Wikidata の名前検索（`wbsearchentities`、日本語）と `wbgetentities` で引いた。取得の道具は `tools/research/appear-authority-candidates.cjs`、取得した要求の URL と時刻、候補の版（revision）・生没年は `appear-person-authority-candidates.json` に残した。

**これは同定ではない。** 名前の検索で出た人間（P31=Q5）のうち、ゲームの生年（年表の `g` の 6 番目）と Wikidata の生年（P569）の年が一致するものを数えただけで、curated の `people` へは採用しない。採用には、これまでの典拠の便と同じく、公的な出典（自治体・博物館・文化遺産オンラインなど）で、姓名以外の 2 項目（生年・没年・父など）を確かめる別の工程が要る。ゲームの生年も史料で確かめた値ではない。

## 結果

| 区分 | 人数 |
|---|---|
| 生年が一致する候補がちょうど 1 人 | 93 |
| 生年が一致する候補なし（ゲームの生年が空のものを含む） | 25 |
| 計 | 118 |

## 生年が一致する候補がちょうど 1 人の人物

| 人物 | ゲームの生年 | 候補 | 版 | Wikidata の生年・没年 |
|---|---|---|---|---|
| 河尻秀隆 | 1527 | [Q6379555](https://www.wikidata.org/w/index.php?title=Q6379555&oldid=2521636335) 河尻秀隆 | 2521636335 | 1527〜1582 |
| 鬼庭良直 | 1513 | [Q5363387](https://www.wikidata.org/w/index.php?title=Q5363387&oldid=2521638980) 鬼庭良直 | 2521638980 | 1513〜1586 |
| 須田盛秀 | 1530 | [Q11664645](https://www.wikidata.org/w/index.php?title=Q11664645&oldid=2354833031) 須田盛秀 | 2354833031 | 1530〜1625 |
| 白河義親 | 1541 | [Q11460059](https://www.wikidata.org/w/index.php?title=Q11460059&oldid=2351698036) 小峰義親 | 2351698036 | 1541〜1626 |
| 南部信直 | 1546 | [Q3137467](https://www.wikidata.org/w/index.php?title=Q3137467&oldid=2378288044) 南部信直 | 2378288044 | 1546〜1599 |
| 北信愛 | 1523 | [Q10902500](https://www.wikidata.org/w/index.php?title=Q10902500&oldid=2240492496) 北信愛 | 2240492496 | 1523〜1613 |
| 板部岡江雪斎 | 1537 | [Q11532725](https://www.wikidata.org/w/index.php?title=Q11532725&oldid=2293568008) 板部岡江雪斎 | 2293568008 | 1537〜1609 |
| 矢沢頼綱 | 1518 | [Q10950293](https://www.wikidata.org/w/index.php?title=Q10950293&oldid=2515691986) 矢沢頼綱 | 2515691986 | 1518〜1597 |
| 和田昭為 | 1532 | [Q11418027](https://www.wikidata.org/w/index.php?title=Q11418027&oldid=1379590448) 和田昭為 | 1379590448 | 1532〜1618 |
| 里見義頼 | 1543 | [Q11644669](https://www.wikidata.org/w/index.php?title=Q11644669&oldid=2338160198) 里見義頼 | 2338160198 | 1543〜1587 |
| 上条政繁 | 1545 | [Q6127646](https://www.wikidata.org/w/index.php?title=Q6127646&oldid=2521637412) 上条政繁 | 2521637412 | 1545〜1643 |
| 須田満親 | 1526 | [Q11664642](https://www.wikidata.org/w/index.php?title=Q11664642&oldid=2354833008) 須田満親 | 2354833008 | 1526〜1598 |
| 平岩親吉 | 1542 | [Q849070](https://www.wikidata.org/w/index.php?title=Q849070&oldid=2556902168) 平岩親吉 | 2556902168 | 1542〜1612 |
| 大久保忠世 | 1532 | [Q869401](https://www.wikidata.org/w/index.php?title=Q869401&oldid=2417722604) 大久保忠世 | 2417722604 | 1532〜1594 |
| 石川家成 | 1534 | [Q11585771](https://www.wikidata.org/w/index.php?title=Q11585771&oldid=2556902266) 石川家成 | 2556902266 | 1534〜1609 |
| 姉小路自綱 | 1540 | [Q10943128](https://www.wikidata.org/w/index.php?title=Q10943128&oldid=2355425881) 姉小路頼綱 | 2355425881 | 1540〜1587 |
| 奥村永福 | 1541 | [Q10942615](https://www.wikidata.org/w/index.php?title=Q10942615&oldid=2477598650) 奥村永福 | 2477598650 | 1541〜1624 |
| 蜂屋頼隆 | 1534 | [Q5637100](https://www.wikidata.org/w/index.php?title=Q5637100&oldid=2506581093) 蜂屋頼隆 | 2506581093 | 1534〜1589 |
| 山内一豊 | 1545 | [Q1315878](https://www.wikidata.org/w/index.php?title=Q1315878&oldid=2566928498) 山内一豊 | 2566928498 | 1545〜1605 |
| 安国寺恵瓊 | 1539 | [Q1151711](https://www.wikidata.org/w/index.php?title=Q1151711&oldid=2492910547) 安国寺恵瓊 | 2492910547 | 1539〜1600 |
| 福原貞俊 | 1512 | [Q10446576](https://www.wikidata.org/w/index.php?title=Q10446576&oldid=2544603305) 福原貞俊 | 2544603305 | 1512〜1593 |
| 宇喜多忠家 | 1533 | [Q11449180](https://www.wikidata.org/w/index.php?title=Q11449180&oldid=2186677684) 宇喜多忠家 | 2186677684 | 1533〜 |
| 戸川秀安 | 1538 | [Q11496372](https://www.wikidata.org/w/index.php?title=Q11496372&oldid=2539385495) 戸川秀安 | 2539385495 | 1538〜1597 |
| 谷忠澄 | 1534 | [Q11632918](https://www.wikidata.org/w/index.php?title=Q11632918&oldid=2550639012) 谷忠澄 | 2550639012 | 1534〜1600 |
| 新納忠元 | 1526 | [Q7034472](https://www.wikidata.org/w/index.php?title=Q7034472&oldid=2521642127) 新納忠元 | 2521642127 | 1526〜1611 |
| 上井覚兼 | 1545 | [Q7903777](https://www.wikidata.org/w/index.php?title=Q7903777&oldid=2548237500) 上井覚兼 | 2548237500 | 1545〜1589 |
| 相馬義胤 | 1548 | [Q7559115](https://www.wikidata.org/w/index.php?title=Q7559115&oldid=2244767744) 相馬義胤 (十六代当主) | 2244767744 | 1548〜1635 |
| 大崎義隆 | 1548 | [Q10935206](https://www.wikidata.org/w/index.php?title=Q10935206&oldid=2427496554) 大崎義隆 | 2427496554 | 1548〜1603 |
| 梶原政景 | 1548 | [Q11070343](https://www.wikidata.org/w/index.php?title=Q11070343&oldid=2424810851) 梶原政景 | 2424810851 | 1548〜 |
| 吉川元長 | 1548 | [Q11412944](https://www.wikidata.org/w/index.php?title=Q11412944&oldid=2336607318) 吉川元長 | 2336607318 | 1548〜1587 |
| 堀内氏善 | 1549 | [Q11427294](https://www.wikidata.org/w/index.php?title=Q11427294&oldid=1383297986) 堀内氏善 | 1383297986 | 1549〜1609 |
| 南条元続 | 1549 | [Q11407947](https://www.wikidata.org/w/index.php?title=Q11407947&oldid=2411032469) 南条元続 | 2411032469 | 1549〜1591 |
| 松浦鎮信 | 1549 | [Q3825090](https://www.wikidata.org/w/index.php?title=Q3825090&oldid=2555333659) 松浦鎮信 | 2555333659 | 1549〜1614 |
| 甘粕景継 | 1550 | [Q4739173](https://www.wikidata.org/w/index.php?title=Q4739173&oldid=2521637407) 甘糟景継 | 2521637407 | 1550〜1611 |
| 西園寺公広 | 1537 | [Q7223176](https://www.wikidata.org/w/index.php?title=Q7223176&oldid=1763583433) 西園寺公広 | 1763583433 | 1537〜1588 |
| 肝付良兼 | 1535 | [Q11611491](https://www.wikidata.org/w/index.php?title=Q11611491&oldid=1382980152) 肝付良兼 | 1382980152 | 1535〜1571 |
| 畠山義継 | 1552 | [Q847762](https://www.wikidata.org/w/index.php?title=Q847762&oldid=2210122439) 二本松義継 | 2210122439 | 1552〜1585 |
| 仙石秀久 | 1552 | [Q7450595](https://www.wikidata.org/w/index.php?title=Q7450595&oldid=2559080701) 仙石秀久 | 2559080701 | 1552〜1614 |
| 大宝寺義興 | 1554 | [Q11434356](https://www.wikidata.org/w/index.php?title=Q11434356&oldid=2504094649) 大宝寺義興 | 2504094649 | 1554〜1587 |
| 別所長治 | 1558 | [Q837435](https://www.wikidata.org/w/index.php?title=Q837435&oldid=2549583573) 別所長治 | 2549583573 | 1558〜1580 |
| 藤堂高虎 | 1556 | [Q1377984](https://www.wikidata.org/w/index.php?title=Q1377984&oldid=2556894513) 藤堂高虎 | 2556894513 | 1556〜1630 |
| 肝付兼亮 | 1558 | [Q11611470](https://www.wikidata.org/w/index.php?title=Q11611470&oldid=1383395141) 肝付兼亮 | 1383395141 | 1558〜1634 |
| 尼子勝久 | 1553 | [Q837431](https://www.wikidata.org/w/index.php?title=Q837431&oldid=2502905775) 尼子勝久 | 2502905775 | 1553〜1578 |
| 片倉景綱 | 1557 | [Q843226](https://www.wikidata.org/w/index.php?title=Q843226&oldid=2447523787) 片倉景綱 | 2447523787 | 1557〜1615 |
| 千葉邦胤 | 1557 | [Q11406776](https://www.wikidata.org/w/index.php?title=Q11406776&oldid=2229741440) 千葉邦胤 | 2229741440 | 1557〜1585 |
| 森長可 | 1558 | [Q1071391](https://www.wikidata.org/w/index.php?title=Q1071391&oldid=2453491158) 森長可 | 2453491158 | 1558〜1584 |
| 佐野房綱 | 1558 | [Q11385028](https://www.wikidata.org/w/index.php?title=Q11385028&oldid=2480586946) 佐野房綱 | 2480586946 | 1558〜1601 |
| 北条氏勝 | 1559 | [Q11070019](https://www.wikidata.org/w/index.php?title=Q11070019&oldid=2556821740) 北条氏勝 | 2556821740 | 1559〜1611 |
| 大谷吉継 | 1559 | [Q386265](https://www.wikidata.org/w/index.php?title=Q386265&oldid=2513851732) 大谷吉継 | 2513851732 | 1559〜1600 |
| 伊東祐兵 | 1559 | [Q8014919](https://www.wikidata.org/w/index.php?title=Q8014919&oldid=2555358915) 伊東祐兵 | 2555358915 | 1559〜1600 |
| 直江兼続 | 1560 | [Q1348611](https://www.wikidata.org/w/index.php?title=Q1348611&oldid=2548970624) 直江兼続 | 2548970624 | 1560〜1620/1619 |
| 蘆名盛隆 | 1561 | [Q4805099](https://www.wikidata.org/w/index.php?title=Q4805099&oldid=2480578803) 蘆名盛隆 | 2480578803 | 1561〜1584 |
| 戸沢盛安 | 1566 | [Q10297028](https://www.wikidata.org/w/index.php?title=Q10297028&oldid=2554016571) 戸沢盛安 | 2554016571 | 1566〜1590 |
| 宇都宮国綱 | 1568 | [Q11449719](https://www.wikidata.org/w/index.php?title=Q11449719&oldid=1705137164) 宇都宮国綱 | 1705137164 | 1568〜1608 |
| 有馬晴信 | 1567 | [Q1197394](https://www.wikidata.org/w/index.php?title=Q1197394&oldid=2555352915) 有馬晴信 | 2555352915 | 1567〜1612/1612 |
| 十河存保 | 1554 | [Q10904662](https://www.wikidata.org/w/index.php?title=Q10904662&oldid=2527895062) 十河存保 | 2527895062 | 1554〜1587 |
| 岩城常隆 | 1567 | [Q11474308](https://www.wikidata.org/w/index.php?title=Q11474308&oldid=2480588190) 岩城常隆 (17代) | 2480588190 | 1567〜1590 |
| 片桐且元 | 1556 | [Q1882775](https://www.wikidata.org/w/index.php?title=Q1882775&oldid=2558100867) 片桐且元 | 2558100867 | 1556〜1615 |
| 吉良親実 | 1563 | [Q11365410](https://www.wikidata.org/w/index.php?title=Q11365410&oldid=2527895028) 吉良親実 | 2527895028 | 1563〜1589 |
| 吉川広家 | 1561 | [Q1049766](https://www.wikidata.org/w/index.php?title=Q1049766&oldid=2556916363) 吉川広家 | 2556916363 | 1561〜1625 |
| 由良国繁 | 1550 | [Q11577615](https://www.wikidata.org/w/index.php?title=Q11577615&oldid=2417737773) 由良国繁 | 2417737773 | 1550〜1611 |
| 河野通直 | 1564 | [Q17219022](https://www.wikidata.org/w/index.php?title=Q17219022&oldid=2560206420) 河野通直 | 2560206420 | 1564〜1587 |
| 小野寺義道 | 1566 | [Q7094442](https://www.wikidata.org/w/index.php?title=Q7094442&oldid=2370012694) 小野寺義道 | 2370012694 | 1566〜1646 |
| 志賀親次 | 1566 | [Q11491190](https://www.wikidata.org/w/index.php?title=Q11491190&oldid=2526196606) 志賀親次 | 2526196606 | 1566〜1660 |
| 本多正信 | 1538 | [Q845447](https://www.wikidata.org/w/index.php?title=Q845447&oldid=2556828336) 本多正信 | 2556828336 | 1538〜1616 |
| 織田秀信 | 1580 | [Q1187442](https://www.wikidata.org/w/index.php?title=Q1187442&oldid=2537036295) 織田秀信 | 2537036295 | 1580〜1605/1605 |
| 小笠原貞慶 | 1546 | [Q10856562](https://www.wikidata.org/w/index.php?title=Q10856562&oldid=2350383042) 小笠原貞慶 | 2350383042 | 1546〜1595 |
| 保科正直 | 1542 | [Q2405649](https://www.wikidata.org/w/index.php?title=Q2405649&oldid=2050183355) 保科正直 | 2050183355 | 1542〜1601 |
| 京極高次 | 1563 | [Q587980](https://www.wikidata.org/w/index.php?title=Q587980&oldid=2566307333) 京極高次 | 2566307333 | 1563〜1609 |
| 那須資晴 | 1557 | [Q6967760](https://www.wikidata.org/w/index.php?title=Q6967760&oldid=2556835175) 那須資晴 | 2556835175 | 1557〜1610 |
| 伊達成実 | 1568 | [Q1038673](https://www.wikidata.org/w/index.php?title=Q1038673&oldid=2521637397) 伊達成実 | 2521637397 | 1568〜1646 |
| 滝川雄利 | 1543 | [Q11565172](https://www.wikidata.org/w/index.php?title=Q11565172&oldid=2556834660) 滝川雄利 | 2556834660 | 1543〜1610 |
| 蘆名亀王丸 | 1584 | [Q11625140](https://www.wikidata.org/w/index.php?title=Q11625140&oldid=2355029510) 蘆名亀王丸 | 2355029510 | 1584〜1586 |
| 佐竹義宣 | 1570 | [Q1071525](https://www.wikidata.org/w/index.php?title=Q1071525&oldid=2561075334) 佐竹義宣 | 2561075334 | 1570〜1633 |
| 森忠政 | 1570 | [Q11117105](https://www.wikidata.org/w/index.php?title=Q11117105&oldid=2559128830) 森忠政 | 2559128830 | 1570〜1634 |
| 丹羽長重 | 1571 | [Q909763](https://www.wikidata.org/w/index.php?title=Q909763&oldid=2556827356) 丹羽長重 | 2556827356 | 1571〜1637 |
| 秋田実季 | 1576 | [Q4701233](https://www.wikidata.org/w/index.php?title=Q4701233&oldid=2555268301) 秋田実季 | 2555268301 | 1576〜1660 |
| 小西行長 | 1558 | [Q942553](https://www.wikidata.org/w/index.php?title=Q942553&oldid=2552584454) 小西行長 | 2552584454 | 1555/1558〜1600 |
| 戸沢政盛 | 1585 | [Q5368867](https://www.wikidata.org/w/index.php?title=Q5368867&oldid=2556823205) 戸沢政盛 | 2556823205 | 1585〜1648 |
| 岩城貞隆 | 1583 | [Q11474331](https://www.wikidata.org/w/index.php?title=Q11474331&oldid=2556901617) 岩城貞隆 | 2556901617 | 1583〜1620 |
| 徳川秀忠 | 1579 | [Q314464](https://www.wikidata.org/w/index.php?title=Q314464&oldid=2565480631) 徳川秀忠 | 2565480631 | 1579〜1632 |
| 井伊直孝 | 1590 | [Q877175](https://www.wikidata.org/w/index.php?title=Q877175&oldid=2562123349) 井伊直孝 | 2562123349 | 1590〜1659 |
| 毛利秀元 | 1579 | [Q1133105](https://www.wikidata.org/w/index.php?title=Q1133105&oldid=2556909412) 毛利秀元 | 2556909412 | 1579〜1650 |
| 李舜臣 | 1545 | [Q50184](https://www.wikidata.org/w/index.php?title=Q50184&oldid=2566172188) 李舜臣 | 2566172188 | 1545〜1598 |
| 金時敏 | 1554 | [Q490362](https://www.wikidata.org/w/index.php?title=Q490362&oldid=2547257122) 金時敏 | 2547257122 | 1554〜1592/1592 |
| 権慄 | 1537 | [Q485290](https://www.wikidata.org/w/index.php?title=Q485290&oldid=2465836259) 権慄 | 2465836259 | 1537〜1599/1599 |
| 李如松 | 1549 | [Q712027](https://www.wikidata.org/w/index.php?title=Q712027&oldid=2516512728) 李如松 | 2516512728 | 1549〜1598 |
| 豊臣秀頼 | 1593 | [Q313641](https://www.wikidata.org/w/index.php?title=Q313641&oldid=2562777279) 豊臣秀頼 | 2562777279 | 1593〜1615 |
| 本多忠朝 | 1582 | [Q837870](https://www.wikidata.org/w/index.php?title=Q837870&oldid=2556897969) 本多忠朝 | 2556897969 | 1582〜1615 |
| 前田利常 | 1594 | [Q587204](https://www.wikidata.org/w/index.php?title=Q587204&oldid=2556900878) 前田利常 | 2556900878 | 1594〜1658 |
| 有馬直純 | 1586 | [Q4790672](https://www.wikidata.org/w/index.php?title=Q4790672&oldid=2555356252) 有馬直純 | 2555356252 | 1586〜1641 |
| 後藤基次 | 1560 | [Q2714642](https://www.wikidata.org/w/index.php?title=Q2714642&oldid=2543528729) 後藤基次 | 2543528729 | 1565/1560〜1615 |
| 木村重成 | 1593 | [Q840196](https://www.wikidata.org/w/index.php?title=Q840196&oldid=2521639364) 木村重成 | 2521639364 | 1593〜1615 |

## 生年が一致する候補が無い人物

| 人物 | ゲームの生年 | 検索で出た人間の候補（生年） |
|---|---|---|
| 氏家守棟 | 1530 | Q11128769（1534） |
| 佐瀬種常 | 1522 | Q11383327（1545） |
| 斯波詮直 | 1546 | Q11500879（1548） |
| 松田憲秀 | 1530 | Q10345501（生年なし） |
| 芳賀高継 | 1540 | Q11615854（1526） |
| 菅沼定利 | 1540 | Q11619292（1550） |
| 前田安勝 | 1530 | Q11397525（1550） |
| 久武親直 | 1540 | Q11369456（生年なし） |
| 龍造寺家晴 | 1530 | Q11679391（生年なし） |
| 深水長智 | 1531 | Q11153283（1532） |
| 遠山直景 | 1550 | Q11642053（生年なし）, Q11642054（生年なし） |
| 猪俣邦憲 | 1550 | Q10409875（生年なし） |
| 三村元親 | 1545 | Q10866150（1550） |
| 金子元宅 | 1552 | Q60985157（生年なし） |
| 岩城親隆 | 1534 | Q11474329（1537）, Q11474330（生年なし） |
| 今川氏真 | 空 | Q3100078（1538） |
| 朝比奈泰朝 | 空 | Q11092559（1538） |
| 岡部元信 | 空 | Q1073455（1505）, Q106056828（生年なし） |
| 斎藤龍興 | 空 | Q2880879（1548） |
| 山中幸盛 | 空 | Q8047875（1545） |
| 佐野宗綱 | 1562 | Q11384993（1560）, Q135236738（生年なし） |
| 肝付兼護 | 1566 | Q11611483（1561） |
| 天草種元 | 1550 | Q11443552（生年なし） |
| 明石全登 | 1569 | Q840581（1566） |
| 毛利勝永 | 1578 | Q6951118（1577） |

## 次の工程

- 候補 1 人の 93 人は、公的な出典で 2 項目を確かめた順に、これまでの便と同じ形式で `curated/people` へ採用する。
- 候補の無い 25 人は、別名・通称（例：明石全登の「てるずみ」「たけのり」）や生年の異説で引き直すか、典拠の無い実装の人物として残す。
- 年表の登場の日付（能力値つきの登場）は実装の記録で、綱文に初登場の日が無い人物に日付を作らない（Codex との合意、2026-11-09）。
