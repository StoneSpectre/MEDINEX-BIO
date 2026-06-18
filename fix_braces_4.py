import re

filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('  })', '  {"}"})')
content = content.replace('{version:', '{"{"}version:')

# Ensure {version: "2026-06-17"} has an escaped closing brace
content = content.replace('})', '{"}"})')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed last braces!')
