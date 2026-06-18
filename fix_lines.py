filepath = r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The error lines are 0-indexed in python, so line 689 is index 688.
def fix_line(idx):
    lines[idx] = lines[idx].replace('}', '{"}"}')
    # Fix the double escaping I might have done
    lines[idx] = lines[idx].replace('{"}"}{"}"}', '{"}"}')
    lines[idx] = lines[idx].replace('{"{"}{"{"}', '{"{"}')

for i in [639, 645, 688, 696, 698, 729, 773, 776, 785, 797, 800, 933, 1004, 1007, 1012, 1014, 1015, 1017]:
    fix_line(i)

# For line 640
lines[639] = lines[639].replace('{"}"}</div>', '</div>').replace('          {"}"}', '          {"}"}</div>')

# For line 646 (> issue)
lines[645] = lines[645].replace('Velocity > 2σ', 'Velocity &gt; 2σ')

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print('Fixed lines!')
