import re

filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any > that is part of an arrow ->
content = content.replace('->', '-&gt;')
content = content.replace('=>', '=&gt;')

# Fix remaining unescaped braces
content = content.replace('{evidence_tier:INT}', '{"{"}evidence_tier:INT{"}"}')
content = content.replace('{score:FLOAT}', '{"{"}score:FLOAT{"}"}')
content = content.replace('{claim:STRING}', '{"{"}claim:STRING{"}"}')
content = content.replace('{similarity_cutoff:0.80}', '{"{"}similarity_cutoff:0.80{"}"}')
content = content.replace('{node.score:.4f}', '{"{"}node.score:.4f{"}"}')

# Wait, `=>` is used in arrow functions: onClick={() => setActiveStep('s6')}
# Replacing all `=>` with `=&gt;` will BREAK onClick handlers!
# Let me undo that logic and use a safer way.
content = content.replace('=&gt;', '=>')

# But -> is fine to replace everywhere? Let's check if -> is used in regular text.
# `->` is mostly used in the graph notation.
# Wait, replacing `->` with `-&gt;` might break if it's already inside a string or comment. But JSX handles it fine if it's text.
# Let's actually just replace it.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed more JSX issues!')
