import React, { useEffect, useState, useRef } from 'react';
import { Layout } from "@/components/layout/Layout";
import { Network, Database, Activity, GitBranch } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';

// Map our backend types to colors
const NODE_COLORS: Record<string, string> = {
  Disease: '#ff4e4e',
  Drug: '#4eaaff',
  Gene: '#4eff91',
  Protein: '#ffd04e',
  Paper: '#c84eff',
  Chemical: '#ff8c4e',
  MeSHTerm: '#4effd0',
};

export function KnowledgeGraph() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const fgRef = useRef<any>();

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
    fetch(`${API_URL}/graph`)
      .then(res => res.json())
      .then(data => {
        // Map backend format to react-force-graph format
        const formattedData = {
          nodes: data.nodes.map((n: any) => ({
            ...n,
            val: n.type === 'Disease' ? 4 : n.type === 'Drug' ? 3 : 2, // size
          })),
          links: data.edges.map((e: any) => ({
            ...e,
            source: e.src,
            target: e.dst,
            name: e.relation
          }))
        };
        setGraphData(formattedData);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load graph data:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    // Zoom to fit after data loads
    if (fgRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 50);
      }, 500);
    }
  }, [graphData]);

  return (
    <Layout>
      <div className="pt-24 pb-12 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-4">
            <Network className="w-8 h-8 text-blue-600 mr-3" />
            Biomedical Knowledge Graph
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl">
            Real-time visualization of the biomedical relationships extracted from PubMed literature 
            and MIMIC-IV clinical data.
          </p>
        </div>

        {/* Legend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-8 flex flex-wrap gap-4">
          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mr-4 mt-1">Node Types:</div>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center">
              <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: color }}></div>
              <span className="text-gray-700 font-medium">{type}</span>
            </div>
          ))}
        </div>

        {/* Graph Container */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden" style={{ height: '70vh' }}>
          {loading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel="id"
              nodeColor={node => NODE_COLORS[node.type] || '#999'}
              nodeRelSize={4}
              linkColor={() => 'rgba(200, 200, 200, 0.4)'}
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.2}
              onNodeClick={node => {
                // Center/zoom on node
                fgRef.current.centerAt(node.x, node.y, 1000);
                fgRef.current.zoom(8, 2000);
              }}
              d3Force="charge"
              d3AlphaDecay={0.01}
              d3VelocityDecay={0.4}
            />
          )}
        </div>

      </div>
    </div>
    </Layout>
  );
}
