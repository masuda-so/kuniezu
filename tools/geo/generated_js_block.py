"""生成したIIFEだけを置換し、同じJavaScript内の他の訂正を保持する。"""
import re


def replace_generated_block(text: str, start_marker: str, end_marker: str, body: str) -> str:
    replacement = start_marker+'\n'+body.rstrip()+'\n'+end_marker+'\n'
    if text.count(start_marker) > 1 or text.count(end_marker) > 1:
        raise ValueError('生成ブロックの境界が重複している')
    if start_marker not in text:
        if end_marker in text:
            raise ValueError('開始のない生成ブロック')
        return text.rstrip()+'\n\n'+replacement
    start = text.index(start_marker)
    if end_marker in text:
        end = text.index(end_marker)
        if end < start:
            raise ValueError('生成ブロックの境界順が不正')
        end += len(end_marker)
        if text[end:end+1] == '\n':
            end += 1
    else:
        # 旧形式は、既知の一つのIIFEだけを移行する。末尾全体は切り捨てない。
        tail = text[start+len(start_marker):]
        legacy = re.match(r'\s*\(function\(\)\{\n.*?^\}\)\(\);[ \t]*(?:\n|$)',
                          tail, re.S | re.M)
        if (not legacy or legacy.group(0).count('(function(){') != 1
                or re.search(r'^\s*/\*', legacy.group(0), re.M)):
            raise ValueError('旧生成ブロックの終端を特定できない')
        end = start+len(start_marker)+legacy.end()
    return text[:start]+replacement+text[end:]
