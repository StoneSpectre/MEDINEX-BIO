filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{"{"{"}"}', '{"{"}')
content = content.replace('{"}"}{"{"}"}"{"}"}', '{"}"}')
content = content.replace('{"{"}"}"', '{"}"}')

# Just double check line 934, 1005 etc manually
content = content.replace('{"{"}driver', '{"{"}driver')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed messy braces!')
