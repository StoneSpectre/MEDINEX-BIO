import React, { useEffect, useState } from 'react';
import { Layout } from "@/components/layout/Layout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, AlertTriangle, CheckCircle2, Network, Layers } from 'lucide-react';

export function Analytics() {
  const [topology, setTopology] = useState<any>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/data/topology.json').then(r => r.json()),
      fetch('/data/communities.json').then(r => r.json()),
      fetch('/data/knowledge_gaps.json').then(r => r.json()),
    ])
    .then(([topoData, commData, gapsData]) => {
      setTopology(topoData);
      setCommunities(commData);
      setGaps(gapsData);
      setLoading(false);
    })
    .catch(err => {
      console.error("Failed to load analytics data:", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="pt-24 pb-12 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-4">
            <Activity className="w-8 h-8 text-blue-600 mr-3" />
            Graph Analytics Engine
          </h1>
          <p className="text-xl text-gray-600">
            Insights derived from the biomedical knowledge graph (Step 6).
          </p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Entities" value={topology?.nodes || 0} icon={Layers} color="bg-blue-500" />
          <StatCard title="Total Relations" value={topology?.edges || 0} icon={Network} color="bg-indigo-500" />
          <StatCard 
            title="Disease Coverage" 
            value={`${((gaps?.coverage_disease || 0) * 100).toFixed(1)}%`} 
            subtitle="Treatable via network"
            icon={CheckCircle2} 
            color="bg-emerald-500" 
          />
          <StatCard 
            title="Knowledge Gaps" 
            value={gaps?.n_untreated || 0} 
            subtitle="Untreated diseases"
            icon={AlertTriangle} 
            color="bg-rose-500" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Communities Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Network Communities Detected</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={communities}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="community_id" tickFormatter={(val) => `Comm ${val}`} />
                  <YAxis />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-gray-200 shadow-md rounded-lg">
                            <p className="font-bold text-gray-900 mb-1">Community {data.community_id}</p>
                            <p className="text-sm text-gray-600">Size: {data.size} nodes</p>
                            <p className="text-sm text-gray-600">Dominant: {data.dominant_types?.join(', ')}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="size" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Network Topology */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Topology Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <MetricRow label="Graph Density" value={topology?.density?.toFixed(4)} />
              <MetricRow label="Avg Clustering" value={topology?.avg_clustering?.toFixed(4)} />
              <MetricRow label="Avg Path Length" value={topology?.avg_path_length} />
              <MetricRow label="Connected Components" value={topology?.n_components} />
              <MetricRow label="Largest Component" value={topology?.largest_component} />
              <MetricRow label="Scale-Free Structure" value={topology?.is_scale_free_hint ? 'Yes' : 'No'} />
            </div>
          </div>
        </div>

        {/* Knowledge Gaps Lists */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center text-rose-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Untreated Diseases
            </h3>
            <p className="text-sm text-gray-500 mb-4">Diseases in the graph with no known drug treatments connected.</p>
            <ul className="divide-y divide-gray-100">
              {gaps?.untreated_diseases?.slice(0, 10).map((d: string, i: number) => (
                <li key={i} className="py-3 text-gray-800 capitalize">{d}</li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center text-amber-600">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Undrugged Target Genes
            </h3>
            <p className="text-sm text-gray-500 mb-4">Genes associated with disease but not targeted by any drug.</p>
            <ul className="divide-y divide-gray-100">
              {gaps?.undrugged_genes?.slice(0, 10).map((g: string, i: number) => (
                <li key={i} className="py-3 text-gray-800 uppercase font-mono">{g}</li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
    </Layout>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-center">
      <div className={`p-3 rounded-lg ${color} text-white mr-4`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}
