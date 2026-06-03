import zipfile
import xml.etree.ElementTree as ET
import sys
import os

def extract_text(pptx_path):
    if not os.path.exists(pptx_path):
        return f"File not found: {pptx_path}"
    
    text_by_slide = {}
    with zipfile.ZipFile(pptx_path, 'r') as z:
        for filename in z.namelist():
            if filename.startswith('ppt/slides/slide') and filename.endswith('.xml'):
                # Extract slide number
                slide_num_str = filename.replace('ppt/slides/slide', '').replace('.xml', '')
                try:
                    slide_num = int(slide_num_str)
                except ValueError:
                    slide_num = 999
                    
                xml_content = z.read(filename)
                tree = ET.fromstring(xml_content)
                
                slide_text = []
                for node in tree.iter():
                    if node.tag.endswith('}t'):
                        if node.text:
                            slide_text.append(node.text)
                
                text_by_slide[slide_num] = "\n".join(slide_text)
                
    # Sort by slide number
    output = []
    for num in sorted(text_by_slide.keys()):
        output.append(f"--- SLIDE {num} ---")
        output.append(text_by_slide[num])
        
    return "\n".join(output)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        with open("pptx_output.txt", "w", encoding="utf-8") as f:
            f.write(extract_text(sys.argv[1]))
    else:
        print("Please provide a path to a pptx file")
