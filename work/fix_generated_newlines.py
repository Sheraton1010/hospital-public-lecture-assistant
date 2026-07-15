from pathlib import Path
path = Path('script.js')
s = path.read_text(encoding='utf-8')
for start_marker, end_marker in [
    ('function buildAutoReplyScript(data)', '\nfunction buildReminderScript(data)'),
    ('function buildReminderScript(data)', '\nfunction createScriptSettings(data)')
]:
    start = s.index(start_marker)
    end = s.index(end_marker, start)
    block = s[start:end]
    block = block.replace('\\n', '\\\\n')
    s = s[:start] + block + s[end:]
path.write_text(s, encoding='utf-8')
