import re

filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace any dictionary-like { "key": ... } or { key: ... } that are inside the code blocks.
# A safe way is to find `{` followed by spaces/newlines and a quote or word + colon.
content = re.sub(r'\{\s*(<span className="str">"?[a-zA-Z0-9_]+"</span>\s*:)', r'{"{"}\n\1', content)
content = re.sub(r'\{\s*("?[a-zA-Z0-9_]+"?)(\s*:)', r'{"{"}\1\2', content)

# And replace `}` that are alone on a line or followed by `,` or `)` or `]`.
# Instead of complex regex, let's just do the ones we see.

# For line 635-640
content = content.replace('          return {\n            <span className="str">"relation_frequency"</span>: freq,', '          return {"{"}\n            <span className="str">"relation_frequency"</span>: freq,')
content = content.replace('            <span className="str">"citation_velocity"</span>:  velocity,\n          }', '            <span className="str">"citation_velocity"</span>:  velocity,\n          {"}"}')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed braces on line 635-640")
