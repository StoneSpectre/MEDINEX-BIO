import fitz
doc = fitz.open('data/guyton_hall_physiology.pdf')
text = ''
for i in range(40, 55):
    text += doc[i].get_text() + '\n'
print(text[:1500])
