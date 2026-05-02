import { useState, useEffect } from 'react';
import { Card, Badge } from '../components/ui';
import { BellRing, Check, AlertTriangle, Loader2, CloudRain, Cpu } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getAlerts, resolveAlert } from '../api/shipmentApi';

interface AlertItem {
  _id?: string;
  shipment_id: string;
  alert_type: string;
  message: string;
  severity: string;
  resolved: boolean;
  created_at: string;
  resolved_by?: string;
  resolved_at?: string;
}

export function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getAlerts();
        if (res.success) setAlerts(res.data || []);
      } catch (err) {
        console.error('[Alerts] Failed to load:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleResolve = async (alertId: string) => {
    try {
      const res = await resolveAlert(alertId, 'Current User');
      if (res.success) {
        setAlerts(alerts.map(a => a._id === alertId ? { ...a, resolved: true } : a));
      }
    } catch (err) {
      console.error('[Alerts] Failed to resolve:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        <span className="ml-3 text-gray-500">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <BellRing className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">System Alerts</h2>
            <p className="text-sm text-gray-500">Monitor and resolve critical system warnings</p>
          </div>
        </div>

        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Check className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900">All Clear</p>
              <p>No active alerts at the moment.</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div 
                key={alert._id || alert.shipment_id + alert.created_at} 
                className={`p-6 rounded-xl border transition-all duration-300 ${
                  alert.resolved 
                    ? 'border-gray-200 bg-gray-50 opacity-70' 
                    : 'border-red-200 bg-red-50/30 shadow-sm'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full mt-1 ${alert.resolved ? 'bg-gray-200 text-gray-500' : alert.alert_type === 'Climate Risk' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                      {alert.alert_type === 'Climate Risk' ? <CloudRain className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className={`font-semibold ${alert.resolved ? 'text-gray-700' : 'text-gray-900'}`}>{alert.alert_type}</h3>
                        <Badge variant={alert.resolved ? 'default' : alert.alert_type === 'Climate Risk' ? 'info' : 'danger'}>{alert.resolved ? 'Resolved' : 'Active'}</Badge>
                        {alert.severity && <Badge variant={alert.severity === 'CRITICAL' && alert.alert_type !== 'Climate Risk' ? 'danger' : 'default'}>{alert.severity}</Badge>}
                        {/* IoT source badge */}
                        {alert.source === 'IOT_SENSOR' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Cpu className="w-2.5 h-2.5" /> IOT SENSOR
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Shipment: <span className="font-medium">{alert.shipment_id}</span></p>
                      {alert.device_id && (
                        <p className="text-xs text-gray-500 mb-1 font-mono">Device: {alert.device_id}</p>
                      )}
                      <p className="text-sm text-gray-800 bg-white p-2 rounded border border-gray-100 inline-block">
                        {alert.message}
                      </p>
                    </div>
                  </div>

                  
                  <div className="flex flex-col items-end gap-3 min-w-[120px]">
                    <span className="text-xs text-gray-500 font-medium">
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                    </span>
                    {!alert.resolved && alert._id && (
                      <button 
                        onClick={() => handleResolve(alert._id!)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 w-full justify-center"
                      >
                        <Check className="w-4 h-4" /> Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
