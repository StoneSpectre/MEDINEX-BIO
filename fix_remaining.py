import re

filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the missing `{"}"}` closures where `{"{"}` was inserted
# Line 640
content = content.replace('          }</div>', '          {"}"}</div>')
# Line 646: >
content = content.replace('Velocity > 2σ', 'Velocity &gt; 2σ')
# 689, 697, 699
content = content.replace('"num_epochs": <span className="num">200</span>},', '"num_epochs": <span className="num">200</span>}{"}"},')
content = content.replace('"embedding_dim": <span className="num">256</span>},', '"embedding_dim": <span className="num">256</span>}{"}"},')

# 730
content = content.replace('              }\n              <span className="kw">for</span> i', '              {"}"}\n              <span className="kw">for</span> i')

# 774
content = content.replace('      <span className="str">"variants"</span>:  [<span className="str">"R175H"</span>]\n    },', '      <span className="str">"variants"</span>:  [<span className="str">"R175H"</span>]\n    {"}"},')

# 777
content = content.replace('"tail":<span className="str">"NSCLC"</span>,"conf":<span className="num">0.94</span>}', '"tail":<span className="str">"NSCLC"</span>,"conf":<span className="num">0.94</span>}{"}"}')

# 786
content = content.replace('  }</div>', '  {"}"}</div>')

# 798
content = content.replace('      <span className="str">"open_access"</span>: <span className="kw">true</span>\n    },', '      <span className="str">"open_access"</span>: <span className="kw">true</span>\n    {"}"},')

# 801
content = content.replace('    <span className="str">"limit"</span>: <span className="num">20</span>\n  }</div>', '    <span className="str">"limit"</span>: <span className="num">20</span>\n  {"}"}</div>')

# 934
content = content.replace('capabilities: [gpu]}]', 'capabilities: [gpu]}{"}"}]')

# 1005, 1008
content = content.replace('{"{"}app: medinex-api}', '{"{"}app: medinex-api{"}"}')

# 1013
content = content.replace('containerPort: <span className="num">8000</span>}]', 'containerPort: <span className="num">8000</span>}{"}"}]')

# 1015, 1016
content = content.replace('memory: <span className="str">"512Mi"</span>}', 'memory: <span className="str">"512Mi"</span>}{"}"}')
content = content.replace('memory: <span className="str">"2Gi"</span>}', 'memory: <span className="str">"2Gi"</span>}{"}"}')

# 1018
content = content.replace('path: /health, port: <span className="num">8000</span>}', 'path: /health, port: <span className="num">8000</span>}{"}"}')


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Fixed remaining JSX braces!')
