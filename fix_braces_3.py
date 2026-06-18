import re

filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the { and } for the GraphSnapshot block
content = content.replace('(:GraphSnapshot {', '(:GraphSnapshot {"{"}')
content = content.replace('  })', '  {"}"})')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed GraphSnapshot braces!')
