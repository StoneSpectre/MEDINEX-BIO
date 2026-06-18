import re

filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{confidence:FLOAT, pmids:[]}', '{"{"}confidence:FLOAT, pmids:[]{"}"}')
content = content.replace('{tissue:STRING}', '{"{"}tissue:STRING{"}"}')
content = content.replace('{mechanism:STRING}', '{"{"}mechanism:STRING{"}"}')
content = content.replace('{source_disease}', '{"{"}source_disease{"}"}')
content = content.replace('{source}', '{"{"}source{"}"}')
content = content.replace('{query}', '{"{"}query{"}"}')
content = content.replace('{gene_name}', '{"{"}gene_name{"}"}')
content = content.replace('{pmid}', '{"{"}pmid{"}"}')
content = content.replace('{node.score:.3f}', '{"{"}node.score:.3f{"}"}')
content = content.replace("{node.metadata.get('file_name')}", "{\"{\"}node.metadata.get('file_name'){\"}\"}")
content = content.replace("{node.metadata.get('page_label','?')}", "{\"{\"}node.metadata.get('page_label','?'){\"}\"}")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed unescaped braces!')
