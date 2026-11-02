/* Report marker types only; never echo captured credentials. */
const patterns=[
 ['embedded-map-key',/AIza[0-9A-Za-z_-]{35}/g],
 ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
 ['aws-access-key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
 ['github-token',/\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{40,255})\b/g],
 ['slack-token',/\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g]
];
function sensitiveMarkers(bytes){const text=bytes.toString('utf8');return patterns.flatMap(([kind,pattern])=>{pattern.lastIndex=0;let count=0;while(pattern.exec(text))count++;return count?[{kind,count}]:[];});}
function assertSourceSafe(bytes,label){const hits=sensitiveMarkers(bytes);if(hits.length)throw Error('原本保存を中止: '+label+' ('+hits.map(h=>h.kind+':'+h.count).join(', ')+')');}
module.exports={sensitiveMarkers,assertSourceSafe};
