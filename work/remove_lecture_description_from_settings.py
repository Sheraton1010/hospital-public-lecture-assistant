from pathlib import Path
path = Path('script.js')
s = path.read_text(encoding='utf-8')
s = s.replace('    lectureDescription: data.lectureDescription,\n', '')
path.write_text(s, encoding='utf-8')
