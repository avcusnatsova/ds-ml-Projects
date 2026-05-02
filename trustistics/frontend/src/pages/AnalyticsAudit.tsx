import { useState, useEffect } from 'react';
import { Card, Badge, RiskBadge } from '../components/ui';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line
} from 'recharts';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getAnalyticsSummary, listShipments } from '../api/shipmentApi';

export function AnalyticsAudit() {
  const [summary, setSummary] = useState<any>(null);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [analyticsRes, shipmentsRes] = await Promise.all([
          getAnalyticsSummary().catch(() => null),
          listShipments(50).catch(() => null),
        ]);
        if (analyticsRes?.success) setSummary(analyticsRes.data);
        if (shipmentsRes?.success) setShipments(shipmentsRes.data || []);
      } catch (err) {
        console.error('[Analytics] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Build chart data from real shipments
  const chartData = (() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts: Record<string, { shipments: number; flagged: number }> = {};
    days.forEach(d => counts[d] = { shipments: 0, flagged: 0 });
    
    shipments.forEach((s: any) => {
      if (s.created_at) {
        const day = days[new Date(s.created_at).getDay()];
        counts[day].shipments++;
        if (s.status === 'FLAGGED' || (s.risk_score && s.risk_score > 70)) {
          counts[day].flagged++;
        }
      }
    });
    return days.map(d => ({ name: d, ...counts[d] }));
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6 border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics &amp; Blockchain Audit</h2>
          <p className="text-gray-400 mt-1">System-wide performance and immutable logs</p>
        </div>
        <button className="px-4 py-2 bg-[#871364] text-white text-sm font-medium rounded-lg hover:bg-[#6d0f50] transition-colors">
          Export Report
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Total Shipments</p>
            <p className="text-3xl font-bold text-gray-900">{summary.shipments?.total ?? 0}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Documents</p>
            <p className="text-3xl font-bold text-gray-900">{summary.documents?.total ?? 0}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Temp Breaches</p>
            <p className="text-3xl font-bold text-red-600">{summary.temperature?.total_breaches ?? 0}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-sm text-gray-500">Unresolved Alerts</p>
            <p className="text-3xl font-bold text-amber-600">{summary.alerts?.unresolved ?? 0}</p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Shipment Volume vs Flagged</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="shipments" name="Total Shipments" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar dataKey="flagged" name="Flagged" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-gray-900 mb-6">Risk Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="flagged" name="Flagged Count" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-gray-900 mb-6">All Shipments</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Shipment ID</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3 rounded-r-lg">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shipments.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No shipments yet.</td></tr>
              ) : (
                shipments.map((s: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <Link to={`/supplier/tracking?id=${s.shipment_id}`} className="text-teal-600 hover:underline font-medium">{s.shipment_id}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-900">{s.product}</td>
                    <td className="px-4 py-3 text-slate-600">{s.origin}</td>
                    <td className="px-4 py-3">
                      <Badge variant={s.status === 'FLAGGED' ? 'danger' : 'default'}>{s.status || 'CREATED'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBadge score={s.risk_score ?? 0} />
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {s.created_at ? format(new Date(s.created_at), 'yyyy-MM-dd HH:mm') : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
