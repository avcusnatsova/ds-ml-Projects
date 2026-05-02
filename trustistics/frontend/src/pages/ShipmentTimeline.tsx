import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Badge, RiskBadge } from '../components/ui';
import { MapPin, FileText, CheckCircle2, AlertTriangle, Box, Search, Loader2, Database, Link as LinkIcon, Clock, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { getTimeline, getShipment } from '../api/shipmentApi';

export function ShipmentTimeline() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [shipmentId, setShipmentId] = useState(initialId);
  const [events, setEvents] = useState<any[]>([]);
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialId) handleSearch(initialId);
  }, [initialId]);

  const handleSearch = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    try {
      const [timelineRes, shipmentRes] = await Promise.all([
        getTimeline(id),
        getShipment(id),
      ]);
      if (timelineRes.success) setEvents(timelineRes.data?.events || []);
      if (shipmentRes.success) setShipment(shipmentRes.data);
    } catch (err) {
      console.error('[ShipmentTimeline] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={shipmentId}
              onChange={(e) => setShipmentId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(shipmentId)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="Enter Shipment ID..."
            />
          </div>
          <button
            onClick={() => handleSearch(shipmentId)}
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 disabled:opacity-70"
          >
            {loading ? 'Loading...' : 'Load Timeline'}
          </button>
        </div>
      </Card>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      )}

      {!loading && events.length > 0 && (
        <Card className="p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-6 h-6 text-indigo-600" />
                Blockchain Event Log
              </h2>
              <p className="text-sm text-slate-500 font-mono mt-1">Contract: 0x5FbDB2315678afecb367f032d93F642f64180aa3</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={shipment?.status === 'FLAGGED' ? 'warning' : 'default'}>
                {shipment?.status || 'CREATED'}
              </Badge>
            </div>
          </div>

          <div className="space-y-4">
            {events.map((item: any, idx: number) => {
              const eventColor = 
                item.event_type.includes('CUSTOMS') ? 'border-purple-500 text-purple-600 bg-purple-50' :
                item.event_type.includes('STORAGE') ? 'border-indigo-500 text-indigo-600 bg-indigo-50' :
                item.event_type.includes('DELIVERED') ? 'border-green-500 text-green-600 bg-green-50' :
                item.event_type.includes('FLAGGED') || item.event_type.includes('REJECTED') ? 'border-red-500 text-red-600 bg-red-50' :
                'border-teal-500 text-teal-600 bg-teal-50';

              return (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-200 group-hover:bg-indigo-500 transition-colors" />
                  
                  <div className="flex flex-wrap items-start justify-between gap-4 ml-2">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded border text-xs font-bold uppercase tracking-wider ${eventColor}`}>
                        {item.event_type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-slate-500 flex items-center gap-1 font-medium">
                        <Clock className="w-4 h-4" />
                        {item.timestamp ? format(new Date(item.timestamp), 'MMM dd, yyyy HH:mm:ss') : 'Pending Block'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-2 mt-4">
                    <div className="space-y-3">
                      {item.location && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Location / Node</span>
                            <span className="text-sm font-medium text-slate-800">{item.location}</span>
                          </div>
                        </div>
                      )}
                      <div className="flex items-start gap-2">
                        <Database className="w-4 h-4 text-slate-400 mt-0.5" />
                        <div>
                          <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">Data Payload Hash (SHA-256)</span>
                          <span className="text-xs font-mono text-slate-600 break-all bg-slate-50 px-2 py-1 rounded block mt-1 border border-slate-100">
                            {item.data_hash || 'Pending anchor'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                      <div className="flex items-center gap-2 mb-2">
                        <LinkIcon className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Blockchain Receipt</span>
                      </div>
                      {item.tx_hash ? (
                        <div className="space-y-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block mb-0.5">Transaction Hash</span>
                            <span className="text-xs font-mono text-green-400 break-all">{item.tx_hash}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                            <span className="text-[10px] text-slate-500">Status:</span>
                            <span className="text-xs font-medium text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Confirmed</span>
                            <span className="text-[10px] text-slate-500 ml-auto">Network: Sepolia Testnet</span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 italic flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Anchoring to block...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {!loading && events.length === 0 && shipmentId && (
        <Card className="p-8 text-center text-gray-500">
          <p>No events found. Enter a valid shipment ID to see the timeline.</p>
        </Card>
      )}
    </div>
  );
}
