import { useState, useEffect, useCallback } from 'react';
import { Card, Badge, RiskBadge, ProgressTracker } from '../components/ui';
import { Package, CheckCircle2, AlertTriangle, Truck, Loader2, RefreshCw, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listShipments, getAnalyticsSummary, type BackendShipment } from '../api/shipmentApi';

export function Dashboard() {
  const [shipments, setShipments] = useState<BackendShipment[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [shipRes, analyticsRes] = await Promise.all([
        listShipments(),
        getAnalyticsSummary().catch(() => null),
      ]);
      if (shipRes.success) setShipments(shipRes.data || []);
      if (analyticsRes?.success) setSummary(analyticsRes.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('[Dashboard] Failed to load data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const totalShipments = summary?.shipments?.total ?? shipments.length;
  const byStatus = summary?.shipments?.by_status ?? {};
  const stats = [
    { label: 'Total Shipments', value: totalShipments, icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active / In Transit', value: (byStatus['CREATED'] ?? 0) + (byStatus['IN_TRANSIT'] ?? 0) + (byStatus['IN_STORAGE'] ?? 0) + (byStatus['AT_CUSTOMS'] ?? 0) + (byStatus['CUSTODY_TRANSFER'] ?? 0), icon: Truck, color: 'text-teal-600', bg: 'bg-teal-100' },
    { label: 'Flagged', value: byStatus['FLAGGED'] ?? 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Delivered', value: byStatus['DELIVERED'] ?? 0, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className="p-6 flex items-center gap-4">
              <div className={`p-4 rounded-full ${stat.bg} ${stat.color}`}>
                <Icon className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Recent Shipments</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Auto-refreshes every 10s &nbsp;·&nbsp; Last: {lastRefreshed.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Search ID or product..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 w-48"
              />
            </div>
            
            <select 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active (In Transit/Storage)</option>
              <option value="FLAGGED">Flagged / Rejected</option>
              <option value="DELIVERED">Delivered</option>
            </select>

            <select 
              value={filterDate} 
              onChange={e => setFilterDate(e.target.value)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">Last 7 Days</option>
            </select>

            <button onClick={() => load()} className="p-2 text-gray-400 hover:text-teal-600 transition-colors bg-white rounded-lg border border-gray-200 shadow-sm" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link to="/supplier/analytics" className="text-sm text-teal-600 font-medium hover:text-teal-700 bg-teal-50 px-3 py-2 rounded-lg border border-teal-100">View Analytics →</Link>
          </div>
        </div>


        {(() => {
          // Apply filters
          const filtered = shipments.filter(s => {
            // 1. Search Query
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              if (!s.shipment_id.toLowerCase().includes(q) && !s.product.toLowerCase().includes(q)) {
                return false;
              }
            }
            // 2. Status
            if (filterStatus !== 'ALL') {
              const status = s.status || 'CREATED';
              if (filterStatus === 'ACTIVE') {
                if (status === 'DELIVERED' || status === 'FLAGGED' || status === 'REJECTED') return false;
              } else if (filterStatus === 'FLAGGED') {
                if (status !== 'FLAGGED' && status !== 'REJECTED') return false;
              } else if (filterStatus === 'DELIVERED') {
                if (status !== 'DELIVERED') return false;
              }
            }
            // 3. Date
            if (filterDate !== 'ALL' && s.created_at) {
              const createdDate = new Date(s.created_at);
              const now = new Date();
              const diffHours = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
              if (filterDate === 'TODAY' && diffHours > 24) return false;
              if (filterDate === 'WEEK' && diffHours > 24 * 7) return false;
            }
            return true;
          });

          if (shipments.length === 0) {
            return (
              <Card className="p-12 text-center text-gray-400 border-dashed">
                No shipments yet. Create your first shipment to get started.
              </Card>
            );
          }

          if (filtered.length === 0) {
            return (
              <Card className="p-12 text-center text-gray-400 border-dashed">
                No shipments match your current filters.
              </Card>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((shipment) => {
                return (
                <Card key={shipment.shipment_id} className="p-6 hover:shadow-md transition-all border-gray-100 group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-1">
                      <h3 className="font-mono font-bold text-gray-900 group-hover:text-teal-600 transition-colors">{shipment.shipment_id}</h3>
                      <p className="text-sm text-gray-500">{shipment.product}</p>
                    </div>
                    <RiskBadge score={shipment.risk_score ?? 0} />
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4 py-2 px-1 bg-gray-50 rounded-lg border border-gray-100">
                    <ProgressTracker status={shipment.status} compact />
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Destination</span>
                      <span className="text-sm font-medium text-gray-700">{shipment.destination}</span>
                    </div>
                    {shipment.customs_status && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-400">Customs</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          shipment.customs_status === 'CLEARED' ? 'bg-green-100 text-green-700' :
                          shipment.customs_status === 'HELD' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {shipment.customs_status}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Link 
                      to={`/supplier/tracking?id=${shipment.shipment_id}`} 
                      className="flex-1 py-2 text-center bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
                    >
                      Track
                    </Link>
                    <Link 
                      to={`/supplier/verify`} 
                      className="px-4 py-2 text-center bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      Verify
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )
        })()}
      </div>
    </div>
  );
}

