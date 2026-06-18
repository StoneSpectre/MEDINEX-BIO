filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken style tags
content = content.replace('style={{"{"}', 'style={{')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed style tags!')
