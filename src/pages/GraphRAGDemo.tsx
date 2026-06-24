import React, { useState, useEffect } from 'react';
import BioquoraPipeline from '../components/bioquora-pipeline';
import BioquoraStep1 from '../components/bioquora-step1';
import BioquoraStep5Step6 from '../components/bioquora-step5-step6';
import BioquoraCopilotDAG from '../components/bioquora-copilot-dag';

export default function GraphRAGDemo() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('anthropic_api_key');
    if (saved) setApiKey(saved);
  }, []);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setApiKey(val);
    localStorage.setItem('anthropic_api_key', val);
  };

  const tabs = [
    { id: 'pipeline', label: 'Pipeline (Steps 1-3)' },
    { id: 'step1', label: 'Step 1 Analysis' },
    { id: 'step56', label: 'Steps 5 & 6' },
    { id: 'copilot-dag', label: 'AI Planner DAG' }
  ];

  return (
    <div style={{ background: '#0A0F1E', minHeight: '100vh', color: '#E2E8F0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', gap: '8px', padding: '16px', borderBottom: '1px solid #1E293B', background: '#0D1B2A', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: '0 24px 0 0', fontSize: '18px', color: '#00C2A8', display: 'flex', alignItems: 'center' }}>
            Bioquora Demo
          </h1>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                background: activeTab === tab.id ? '#00C2A822' : 'transparent',
                color: activeTab === tab.id ? '#00C2A8' : '#64748B',
                border: `1px solid ${activeTab === tab.id ? '#00C2A844' : 'transparent'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 600 : 400
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>ANTHROPIC API KEY:</label>
          <input 
            type="password" 
            placeholder="sk-ant-api03-..." 
            value={apiKey}
            onChange={handleApiKeyChange}
            style={{
              background: '#050D18', border: '1px solid #1E293B', color: '#E2E8F0',
              padding: '6px 12px', borderRadius: '4px', fontSize: '12px', width: '250px'
            }}
          />
        </div>
      </div>
      
      <div style={{ height: 'calc(100vh - 65px)', overflow: 'auto' }}>
        {activeTab === 'pipeline' && <BioquoraPipeline />}
        {activeTab === 'step1' && <BioquoraStep1 />}
        {activeTab === 'step56' && <BioquoraStep5Step6 />}
        {activeTab === 'copilot-dag' && <BioquoraCopilotDAG />}
      </div>
    </div>
  );
}
