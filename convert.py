import os, re

html_path = r'C:\Users\hp\Downloads\medinex-steps-6-7.html'
with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract CSS
style_match = re.search(r'<style>(.*?)</style>', content, re.DOTALL)
css = style_match.group(1).strip() if style_match else ''

with open(r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.css', 'w', encoding='utf-8') as f:
    f.write(css)

# Extract Body
body_match = re.search(r'<body>(.*?)<script>', content, re.DOTALL)
body = body_match.group(1).strip() if body_match else ''

# Reactify HTML
body = body.replace('class=', 'className=')
body = body.replace('onclick=', 'onClick=')
body = body.replace('style="color:var(--accent3)"', 'style={{color: "var(--accent3)"}}')
body = body.replace('style="color:var(--accent2)"', 'style={{color: "var(--accent2)"}}')
body = body.replace('style="color:var(--warn)"', 'style={{color: "var(--warn)"}}')
body = body.replace('style="margin-bottom:20px"', 'style={{marginBottom: "20px"}}')
body = body.replace('style="background:rgba(0,198,255,0.1)"', 'style={{background: "rgba(0,198,255,0.1)"}}')
body = body.replace('style="background:rgba(0,255,157,0.1)"', 'style={{background: "rgba(0,255,157,0.1)"}}')
body = body.replace('style="background:rgba(123,97,255,0.1)"', 'style={{background: "rgba(123,97,255,0.1)"}}')
body = body.replace('style="background:rgba(255,107,53,0.1)"', 'style={{background: "rgba(255,107,53,0.1)"}}')
body = body.replace('style="background:rgba(0,255,157,0.15)"', 'style={{background: "rgba(0,255,157,0.15)"}}')
body = body.replace('style="background:rgba(0,198,255,0.15)"', 'style={{background: "rgba(0,198,255,0.15)"}}')
body = body.replace('style="background:rgba(123,97,255,0.15)"', 'style={{background: "rgba(123,97,255,0.15)"}}')
body = body.replace('style="background:rgba(255,107,53,0.15)"', 'style={{background: "rgba(255,107,53,0.15)"}}')
body = body.replace('style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--accent2);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px"', 'style={{fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--accent2)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "12px"}}')
body = body.replace('style="margin-bottom:16px"', 'style={{marginBottom: "16px"}}')
body = body.replace('style="color:var(--muted);font-size:12px;margin-top:6px"', 'style={{color: "var(--muted)", fontSize: "12px", marginTop: "6px"}}')
body = body.replace('style="margin-top:8px"', 'style={{marginTop: "8px"}}')
body = body.replace('style="margin-top:16px"', 'style={{marginTop: "16px"}}')
body = body.replace('style="font-size:11px"', 'style={{fontSize: "11px"}}')
body = body.replace('style="margin-top:28px;padding-top:20px;border-top:1px solid var(--border)"', 'style={{marginTop: "28px", paddingTop: "20px", borderTop: "1px solid var(--border)"}}')
body = body.replace('style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:1px"', 'style={{fontFamily: "JetBrains Mono, monospace", fontSize: "11px", color: "var(--muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "1px"}}')
body = body.replace('style="margin-top:20px;color:var(--muted);font-size:13px;line-height:1.7"', 'style={{marginTop: "20px", color: "var(--muted)", fontSize: "13px", lineHeight: "1.7"}}')

body = body.replace("onClick=\"showStep('s6')\"", "onClick={() => setActiveStep('s6')}")
body = body.replace("onClick=\"showStep('s7')\"", "onClick={() => setActiveStep('s7')}")
body = body.replace("onClick=\"showStep('infra')\"", "onClick={() => setActiveStep('infra')}")
body = body.replace("onClick=\"showModule('m71')\"", "onClick={() => setActiveModule('m71')}")
body = body.replace("onClick=\"showModule('m72')\"", "onClick={() => setActiveModule('m72')}")
body = body.replace("onClick=\"showModule('m73')\"", "onClick={() => setActiveModule('m73')}")
body = body.replace("onClick=\"showModule('m74')\"", "onClick={() => setActiveModule('m74')}")
body = body.replace("onClick=\"showModule('m75')\"", "onClick={() => setActiveModule('m75')}")
body = body.replace("onClick=\"showModule('m76')\"", "onClick={() => setActiveModule('m76')}")
body = body.replace("onClick=\"showModule('m77')\"", "onClick={() => setActiveModule('m77')}")

# Handling classes based on state
body = body.replace('className="step-tab active"', 'className={`step-tab ${activeStep === \'s6\' ? \'active\' : \'\'}`}')
body = body.replace('className="step-tab" onClick={() => setActiveStep(\'s7\')}', 'className={`step-tab ${activeStep === \'s7\' ? \'active\' : \'\'}`} onClick={() => setActiveStep(\'s7\')}')
body = body.replace('className="step-tab" onClick={() => setActiveStep(\'infra\')}', 'className={`step-tab ${activeStep === \'infra\' ? \'active\' : \'\'}`} onClick={() => setActiveStep(\'infra\')}')

body = body.replace('id="s6" className="step-panel active"', 'id="s6" className={`step-panel ${activeStep === \'s6\' ? \'active\' : \'\'}`}')
body = body.replace('id="s7" className="step-panel"', 'id="s7" className={`step-panel ${activeStep === \'s7\' ? \'active\' : \'\'}`}')
body = body.replace('id="infra" className="step-panel"', 'id="infra" className={`step-panel ${activeStep === \'infra\' ? \'active\' : \'\'}`}')

body = body.replace('className="module-btn active" onClick={() => setActiveModule(\'m71\')}', 'className={`module-btn ${activeModule === \'m71\' ? \'active\' : \'\'}`} onClick={() => setActiveModule(\'m71\')}')
for m in ['m72', 'm73', 'm74', 'm75', 'm76', 'm77']:
    body = body.replace(f'className="module-btn" onClick={{() => setActiveModule(\'{m}\')}}', f'className={{`module-btn ${{activeModule === \'{m}\' ? \'active\' : \'\'}}`}} onClick={{() => setActiveModule(\'{m}\')}}')

body = body.replace('id="m71" className="module-panel active"', 'id="m71" className={`module-panel ${activeModule === \'m71\' ? \'active\' : \'\'}`}')
for m in ['m72', 'm73', 'm74', 'm75', 'm76', 'm77']:
    body = body.replace(f'id="{m}" className="module-panel"', f'id="{m}" className={{`module-panel ${{activeModule === \'{m}\' ? \'active\' : \'\'}}`}}')


react_code = f"""import React, {{ useState }} from 'react';
import './Steps67.css';

const Steps67 = () => {{
  const [activeStep, setActiveStep] = useState('s6');
  const [activeModule, setActiveModule] = useState('m71');

  return (
    <div className="steps-67-container">
      {{/* Wrapper div to contain the styles if needed */}}
      {body}
    </div>
  );
}};

export default Steps67;
"""

with open(r'C:\Users\hp\Downloads\MEDINEX-BIO\src\pages\Steps67.tsx', 'w', encoding='utf-8') as f:
    f.write(react_code)
print('Done!')
