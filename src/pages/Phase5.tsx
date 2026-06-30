import React, { useEffect } from 'react';
import './Phase5.css';
import BioquoraStep1 from '../components/bioquora-step1';
import BioquoraStep5Step6 from '../components/bioquora-step5-step6';

const Phase5: React.FC = () => {
  useEffect(() => {
    const steps = document.querySelectorAll('.step');
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    steps.forEach((s, i) => {
      (s as HTMLElement).style.transitionDelay = `${i * 0.06}s`;
      obs.observe(s);
    });

    setTimeout(() => {
      steps.forEach(s => {
        const rect = s.getBoundingClientRect();
        if (rect.top < window.innerHeight) s.classList.add('visible');
      });
    }, 100);

    return () => {
      steps.forEach(s => obs.unobserve(s));
    };
  }, []);

  return (
    <div className="phase5-container">
      {/* ═══ Navigation ═══ */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.05)", paddingBottom: "16px", marginBottom: "32px", padding: "0 24px" }}>
        <a href="/roadmap" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#6366f1", textDecoration: "none", fontSize: "14px", fontWeight: "bold", fontFamily: "monospace" }}>
          <span style={{ fontSize: "18px" }}>←</span> BACK TO HOME
        </a>
        <div style={{ color: "#94a3b8", fontSize: "12px", fontFamily: "monospace", letterSpacing: "2px", textTransform: "uppercase" }}>Recommendation Systems</div>
      </div>

      {/* ═══ HEADER ═══ */}
      <header>
        <div className="phase-badge">Phase 5 · 2029 – 2030</div>
        <h1>Recommendation Systems</h1>
        <p className="subtitle">From Interaction Logging to Hybrid Fusion — creating the personalized intelligence engine of BIOQUORA.</p>
        <div className="header-stats">
          <div className="stat">
            <div className="stat-num">7</div>
            <div className="stat-label">Sequential Steps</div>
          </div>
          <div className="stat">
            <div className="stat-num">3</div>
            <div className="stat-label">Recommendation Engines</div>
          </div>
          <div className="stat">
            <div className="stat-num">RRF</div>
            <div className="stat-label">Hybrid Fusion</div>
          </div>
        </div>
      </header>

      {/* ═══ PIPELINE STEPS ═══ */}
      <div className="pipeline-visual">

        {/* STEP 1 */}
        <div className="step">
          <div className="step-spine">
            <div className="step-node teal">01</div>
          </div>
          <div className="step-card">
            <div className="step-eyebrow teal">Data Layer · Event Tracking</div>
            <div className="step-title">Interaction Tracking & User Modelling</div>
            <div className="step-desc">
              Every interaction is weighted and logged to construct a real-time vector representation of the user's research interests, leveraging exponential time decay.
            </div>
            <div className="sub-items">
              <div className="sub-item">
                <div className="sub-dot teal"></div>
                <div><span className="sub-label">Weighted events</span><span className="sub-body">— Read (1.0), Share (1.8), Save (2.0), Cite (3.0)</span></div>
              </div>
            </div>
            {/* Interactive Demo for Step 1 */}
            <div style={{ marginTop: '30px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '30px' }}>
              <div style={{ marginBottom: '15px', color: '#00D4C8', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '12px' }}>Interactive Demo: Interaction Logger</div>
              <div style={{ height: '600px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#050D18' }}>
                <BioquoraStep1 />
              </div>
            </div>
          </div>
        </div>

        {/* STEP 2 */}
        <div className="step">
          <div className="step-spine">
            <div className="step-node purple">02</div>
          </div>
          <div className="step-card">
            <div className="step-eyebrow purple">Engine 1 · Semantic Similarity</div>
            <div className="step-title">Content-Based Filtering</div>
            <div className="step-desc">
              Matches new papers against the user's profile vector using BioLinkBERT embeddings and Qdrant HNSW vector search.
            </div>
          </div>
        </div>

        {/* STEP 3 */}
        <div className="step">
          <div className="step-spine">
            <div className="step-node amber">03</div>
          </div>
          <div className="step-card">
            <div className="step-eyebrow amber">Engine 2 · Matrix Factorisation</div>
            <div className="step-title">Collaborative Filtering</div>
            <div className="step-desc">
              Identifies implicit peer groups using SVD/ALS. Predicts relevance based on what similar clinical researchers found useful.
            </div>
          </div>
        </div>

        {/* STEP 4 */}
        <div className="step">
          <div className="step-spine">
            <div className="step-node teal">04</div>
          </div>
          <div className="step-card">
            <div className="step-eyebrow teal">Engine 3 · Graph Traversal</div>
            <div className="step-title">Citation Graph Engine</div>
            <div className="step-desc">
              Explores Neo4j graph using Node2Vec to recommend papers structurally connected to the user's seed papers.
            </div>
          </div>
        </div>

        {/* STEP 5 & 6 */}
        <div className="step">
          <div className="step-spine">
            <div className="step-node purple">05</div>
          </div>
          <div className="step-card">
            <div className="step-eyebrow purple">Fusion Layer · RRF</div>
            <div className="step-title">Hybrid Fusion & Multi-Modal Recs</div>
            <div className="step-desc">
              Combines scores from all engines using Reciprocal Rank Fusion (RRF), then scales results by evidence tier (RCTs vs Case Reports). Also provides dataset and topic recommendations via UMAP clustering.
            </div>
            
            {/* Interactive Demo for Step 5 & 6 */}
            <div style={{ marginTop: '30px', borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '30px' }}>
              <div style={{ marginBottom: '15px', color: '#7C3AED', fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '12px' }}>Interactive Demo: Hybrid Fusion Engine</div>
              <div style={{ height: '700px', overflowY: 'auto', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: '#050D18' }}>
                <BioquoraStep5Step6 />
              </div>
            </div>

          </div>
        </div>

        {/* STEP 7 */}
        <div className="step">
          <div className="step-spine">
            <div className="step-node amber">07</div>
          </div>
          <div className="step-card">
            <div className="step-eyebrow amber">Application Layer · Transparency</div>
            <div className="step-title">Explanation Layer & Production API</div>
            <div className="step-desc">
              Feeds the final fused recommendations to an LLM to generate plain-text justifications explaining EXACTLY why a paper was recommended.
            </div>
          </div>
        </div>

      </div>

      <div className="timeline-footer">
        <h3>Phase 5 Delivery Milestones</h3>
        <div className="timeline-row">
          <div className="tl-item">
            <div className="tl-dot" style={{ background: 'var(--teal)' }}></div>
            <div className="tl-q">Q1 2029</div>
            <div className="tl-milestone">Interaction Engine (Step 1)</div>
          </div>
          <div className="tl-item">
            <div className="tl-dot" style={{ background: 'var(--purple)' }}></div>
            <div className="tl-q">Q2 2029</div>
            <div className="tl-milestone">Core Rec Engines (Steps 2–4)</div>
          </div>
          <div className="tl-item">
            <div className="tl-dot" style={{ background: 'var(--amber)' }}></div>
            <div className="tl-q">Q3 2029</div>
            <div className="tl-milestone">Hybrid Fusion & UMAP (Steps 5–6)</div>
          </div>
          <div className="tl-item">
            <div className="tl-dot" style={{ background: 'var(--teal)' }}></div>
            <div className="tl-q">Q4 2029</div>
            <div className="tl-milestone">Explanation API (Step 7)</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Phase5;
