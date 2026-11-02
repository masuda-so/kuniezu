"use strict";
/* 平面の凸。広い肩と短い首。上下の外接範囲を回転原点へ揃え、長い突起の偏りを抑える。 */
window.TKCounter={path(c,w=30,h=20){const neck=w*.42,shoulder=-h*.06,top=-h*.55,bottom=h*.55;c.beginPath();c.moveTo(-w/2,bottom);c.lineTo(-w/2,shoulder);c.lineTo(-neck/2,shoulder);c.lineTo(-neck/2,top);c.lineTo(neck/2,top);c.lineTo(neck/2,shoulder);c.lineTo(w/2,shoulder);c.lineTo(w/2,bottom);c.closePath();}};
