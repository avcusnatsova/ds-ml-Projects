import { useState, useEffect, useRef } from 'react';
import { Card, Badge } from '../../components/ui';
import {
  QrCode, ClipboardList, MapPin, Thermometer, AlertTriangle,
  Box, CloudRain, Cpu, Battery, Wifi, WifiOff,
} from 'lucide-react';
import { recordHandoff, getLiveTracking, checkTransitWeather } from '../../api/shipmentApi';
import { formatDistanceToNow } from 'date-fns';

// ─── Mock data (used before the simulator is connected) ─────────────────────
const MOCK_LIVE = {
  shipment_id: 'SHP-001',
  device_id: 'SENSOR-BOX-A1',
  temperature_celsius: -71.4,
  location: 'Nagpur',
  latitude: 21.1458,
  longitude: 79.0882,
  battery_level: 89.3,
  logged_at: new Date().toISOString(),
  source: 'IOT_SENSOR',
  is_breach: false,
};

// ─── Source Badge ────────────────────────────────────────────────────────────
function SourceBadge({ source }: { source?: string }) {
  if (source === 'IOT_SENSOR') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        IOT SENSOR
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
      Manually Entered
    </span>
  );
}

// ─── Live Sensor Panel ───────────────────────────────────────────────────────
function LiveSensorPanel({ shipmentId }: { shipmentId: string }) {
  const [live, setLive] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const fetchLive = async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getLiveTracking(id);
      if (res.success && res.data) {
        setLive(res.data);
        setConnected(true);
      } else {
        // Show mock when no real data yet
        setLive({ ...MOCK_LIVE, shipment_id: id });
        setConnected(false);
      }
    } catch {
      setLive({ ...MOCK_LIVE, shipment_id: id });
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shipmentId) return;
    fetchLive(shipmentId);
    const interval = setInterval(() => fetchLive(shipmentId), 30000);
    return () => clearInterval(interval);
  }, [shipmentId]);

  if (!shipmentId) {
    return (
      <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
        <Cpu className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        Enter a Shipment ID to see live sensor data
      </div>
    );
  }

  const isRecent = live?.logged_at
    ? (Date.now() - new Date(live.logged_at).getTime()) < 60000
    : false;

  const tempColor = live?.is_breach ? 'text-red-600' : 'text-emerald-600';

  return (
    <div className={`rounded-xl border-2 p-6 ${live?.is_breach ? 'border-red-300 bg-red-50' : 'border-emerald-200 bg-emerald-50/30'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${live?.is_breach ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Live Sensor Data</h3>
            <p className="text-xs text-gray-500">{live?.device_id || 'Connecting...'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
              <WifiOff className="w-3 h-3" />
              Mock Data
            </span>
          )}
        </div>
      </div>

      {live ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-200 text-center">
            <Thermometer className={`w-6 h-6 mx-auto mb-1 ${tempColor}`} />
            <p className={`text-4xl font-black ${tempColor}`}>{live.temperature_celsius}°C</p>
            {live.is_breach && (
              <p className="text-xs text-red-600 font-semibold mt-1 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> BREACH DETECTED
              </p>
            )}
            <div className="mt-2">
              <SourceBadge source={live.source} />
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </p>
            <p className="font-semibold text-gray-900 text-sm">{live.location || 'N/A'}</p>
            {live.latitude && (
              <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                {live.latitude.toFixed(4)}, {live.longitude?.toFixed(4)}
              </p>
            )}
          </div>

          {/* Battery */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
              <Battery className="w-3 h-3" /> Battery
            </p>
            <p className="font-semibold text-gray-900 text-sm">
              {live.battery_level != null ? `${live.battery_level}%` : 'N/A'}
            </p>
            {live.battery_level != null && (
              <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${live.battery_level > 50 ? 'bg-emerald-500' : live.battery_level > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${live.battery_level}%` }}
                />
              </div>
            )}
          </div>

          {/* Last Updated */}
          <div className="col-span-2 bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500">Last Updated</p>
            <p className="text-sm font-medium text-gray-900">
              {live.logged_at
                ? formatDistanceToNow(new Date(live.logged_at), { addSuffix: true })
                : 'N/A'}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Auto-refreshes every 30 seconds • Temperature & location are read-only from sensor
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">Loading sensor data...</div>
      )}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export function DriverDashboard() {
  const [shipmentId, setShipmentId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [receiverParty, setReceiverParty] = useState('Local Warehouse');
  const [weatherAlert, setWeatherAlert] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const handoffRes = await recordHandoff(shipmentId, {
        from_party: 'Driver',
        to_party: receiverParty,
        location: 'Custody Transfer Point',
        notes: notes || undefined,
        signed_by: 'Authorized Driver',
      });

      if (handoffRes.success) {
        setSuccess(`Handoff anchored to blockchain! TX: ${handoffRes.data?.blockchain_tx || 'N/A'}`);
        setNotes('');
      } else {
        setError(handoffRes.error || 'Handoff failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Driver Dashboard</h2>
            <p className="text-sm text-gray-500">
              Temperature & location are tracked automatically by the IoT sensor
            </p>
          </div>
        </div>

        {/* Shipment ID */}
        <div className="space-y-2 mb-6">
          <label className="text-sm font-medium text-gray-700 flex justify-between">
            Shipment ID
            <button
              type="button"
              onClick={() => setIsScanning(!isScanning)}
              className="text-teal-600 flex items-center gap-1 text-xs"
            >
              <QrCode className="w-3 h-3" /> Scan QR
            </button>
          </label>
          <input
            type="text"
            value={shipmentId}
            onChange={e => setShipmentId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            placeholder="e.g. SHP-3601"
          />
        </div>

        {isScanning && (
          <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden mb-6">
            <div className="absolute top-0 left-0 w-full h-1 bg-teal-500 animate-[scan_2s_ease-in-out_infinite]" />
            <p className="text-gray-500">Camera Feed Active</p>
            <button
              type="button"
              onClick={() => { setShipmentId('SHP-9022'); setIsScanning(false); }}
              className="absolute bottom-4 px-4 py-2 bg-white rounded shadow text-sm font-medium hover:bg-gray-50"
            >
              Simulate Successful Scan
            </button>
          </div>
        )}

        {/* 🔵 Live Sensor Panel (replaces manual temperature input) */}
        <div className="mb-6">
          <LiveSensorPanel shipmentId={shipmentId} />
        </div>

        {/* Handoff Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Box className="w-4 h-4 text-blue-500" /> Receiver Party
              </label>
              <select
                value={receiverParty}
                onChange={e => setReceiverParty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white"
              >
                <option value="Local Warehouse">Local Warehouse</option>
                <option value="Customs Checkpoint">Customs Checkpoint</option>
                <option value="Delivery Partner">Delivery Partner</option>
                <option value="Final Destination">Final Destination</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Condition Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="Packaging intact, refrigeration unit stable..."
            />
            {error && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            )}
            {success && <p className="text-sm text-green-600 mt-2">✔ {success}</p>}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading || !shipmentId}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Anchoring to Blockchain...' : 'Record Handoff'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
