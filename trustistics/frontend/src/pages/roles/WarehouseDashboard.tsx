import { useState, useEffect } from 'react';
import { Card } from '../../components/ui';
import { QrCode, Building2, Box, AlertTriangle, Cpu } from 'lucide-react';
import { addEvent, updateShipmentStatus, recordHandoff, getLiveTracking } from '../../api/shipmentApi';

// ─── What changed: ────────────────────────────────────────────────────────────
//   REMOVED: Manual temperature input field & logTemperature call.
//   ADDED:   Live IoT sensor panel that reads the latest sensor data for the shipment.
//   Warehouse managers can only log the storage unit (cold room ID) and notes.
//   All temperature data comes exclusively from the IoT sensor.
// ─────────────────────────────────────────────────────────────────────────────

export function WarehouseDashboard() {
  const [shipmentId, setShipmentId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [storageUnit, setStorageUnit] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live IoT reading for the entered shipment
  const [liveReading, setLiveReading] = useState<any>(null);
  const [fetchingLive, setFetchingLive] = useState(false);

  // Fetch live reading when shipment ID is entered
  useEffect(() => {
    if (!shipmentId.trim()) { setLiveReading(null); return; }
    const fetch = async () => {
      setFetchingLive(true);
      try {
        const res = await getLiveTracking(shipmentId);
        if (res.success && res.data) setLiveReading(res.data);
        else setLiveReading(null);
      } catch { setLiveReading(null); }
      finally { setFetchingLive(false); }
    };
    const timeout = setTimeout(fetch, 600); // debounce
    return () => clearTimeout(timeout);
  }, [shipmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Record handoff to Warehouse
      const handoffRes = await recordHandoff(shipmentId, {
        from_party: 'Driver',
        to_party: 'Warehouse',
        location: `Warehouse - ${storageUnit}`,
        notes: notes || undefined,
        signed_by: 'Warehouse',
      });

      await updateShipmentStatus(shipmentId, 'IN_STORAGE', `Received at ${storageUnit}`);

      if (handoffRes.success) {
        setSuccess(`Intake anchored to blockchain! TX: ${handoffRes.data?.blockchain_tx || 'N/A'}`);
        setShipmentId('');
        setStorageUnit('');
        setNotes('');
        setLiveReading(null);
      } else {
        setError(handoffRes.error || 'Failed to record intake');
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
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Record Storage Intake</h2>
            <p className="text-sm text-gray-500">
              Log facility arrival to the blockchain — temperature is tracked by IoT sensor only
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Shipment ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex justify-between">
              Shipment ID
              <button type="button" onClick={() => setIsScanning(!isScanning)} className="text-teal-600 flex items-center gap-1 text-xs">
                <QrCode className="w-3 h-3" /> Scan QR
              </button>
            </label>
            <input
              required
              type="text"
              value={shipmentId}
              onChange={e => setShipmentId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="e.g. SHP-9021"
            />
          </div>

          {isScanning && (
            <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden">
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

          {/* 🔵 Live IoT Sensor Panel (read-only) */}
          {shipmentId.trim() && (
            <div className={`rounded-xl border-2 p-4 ${
              liveReading?.is_breach
                ? 'border-red-300 bg-red-50'
                : liveReading
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-dashed border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Cpu className={`w-4 h-4 ${liveReading?.is_breach ? 'text-red-500' : liveReading ? 'text-emerald-600' : 'text-gray-400'}`} />
                <span className="text-sm font-semibold text-gray-700">Live IoT Temperature</span>
                {liveReading && (
                  <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    SENSOR
                  </span>
                )}
              </div>
              {fetchingLive ? (
                <p className="text-sm text-gray-400 animate-pulse">Fetching sensor data...</p>
              ) : liveReading ? (
                <div className="flex items-center gap-6">
                  <div>
                    <p className={`text-3xl font-black ${liveReading.is_breach ? 'text-red-600' : 'text-emerald-700'}`}>
                      {liveReading.temperature_celsius}°C
                    </p>
                    {liveReading.is_breach && (
                      <p className="text-xs text-red-600 font-semibold mt-0.5">🚨 BREACH DETECTED</p>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>📍 {liveReading.location}</p>
                    <p>🔋 Battery: {liveReading.battery_level?.toFixed(0)}%</p>
                    <p className="text-xs text-gray-400 font-mono">{liveReading.device_id}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-400">
                  No sensor data yet for this shipment. Run the IoT simulator to start tracking.
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-2">Temperature is read-only — controlled exclusively by the IoT sensor</p>
            </div>
          )}

          {/* Storage Unit */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Box className="w-4 h-4" /> Storage Unit ID
            </label>
            <input
              required
              type="text"
              value={storageUnit}
              onChange={e => setStorageUnit(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="e.g. Cold-Room-B4"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Storage Condition Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="Transferred to ultra-low temp freezer immediately upon arrival..."
            />
            {error && <p className="text-sm text-red-600 mt-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {error}</p>}
            {success && <p className="text-sm text-green-600 mt-2">✔ {success}</p>}
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading || !shipmentId}
              className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Anchoring to Blockchain...' : 'Record Intake'}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
