import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, Badge, RiskBadge, ProgressTracker } from '../components/ui';
import { MapPin, QrCode, Search, Thermometer, Clock, Loader2, CloudRain, AlertTriangle, Cpu, Battery, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { getShipment, getTemperatureLogs, getRouteForecast, getLiveTracking, type BackendShipment } from '../api/shipmentApi';


export function LiveTracking() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get('id') || '';
  const [shipmentId, setShipmentId] = useState(initialId);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<BackendShipment | null>(null);
  const [tempLogs, setTempLogs] = useState<any[]>([]);
  const [liveReading, setLiveReading] = useState<any>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [routeForecast, setRouteForecast] = useState<any[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveShipmentId, setLiveShipmentId] = useState('');


  useEffect(() => {
    if (initialId) handleSearch(initialId);
  }, [initialId]);

  const handleSearch = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getShipment(id);
      if (res.success && res.data) {
        setData(res.data);
        setLiveShipmentId(id);
        const tempRes = await getTemperatureLogs(id).catch(() => null);
        if (tempRes?.success) setTempLogs(tempRes.data || []);
        setLoadingForecast(true);
        try {
          const forecastRes = await getRouteForecast(id);
          if (forecastRes.success) setRouteForecast(forecastRes.data || []);
        } catch { /* silent */ } finally { setLoadingForecast(false); }
      } else {
        setError('Shipment not found');
        setData(null);
        setRouteForecast([]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch shipment');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  // Poll live reading + temp logs every 30 s when a shipment is loaded
  useEffect(() => {
    if (!liveShipmentId) return;
    const fetchLive = async () => {
      try {
        const res = await getLiveTracking(liveShipmentId);
        if (res.success && res.data) {
          setLiveReading(res.data);
          setLiveConnected(true);
        } else {
          setLiveConnected(false);
        }
      } catch { setLiveConnected(false); }
      // Also refresh the log list so new sensor pushes appear
      try {
        const logRes = await getTemperatureLogs(liveShipmentId);
        if (logRes.success) setTempLogs(logRes.data || []);
      } catch { /* silent */ }
    };
    fetchLive();
    const id = setInterval(fetchLive, 30000);
    return () => clearInterval(id);
  }, [liveShipmentId]);

  const latestTemp = liveReading ?? (tempLogs.length > 0 ? tempLogs[0] : null);
  const currentTemp = latestTemp?.temperature_celsius ?? 0;
  const tempMin = data?.min_temp_celsius ?? 2;
  const tempMax = data?.max_temp_celsius ?? 8;

  const mapStatus = (s?: string) => {
    if (!s) return 'Active';
    if (s === 'DELIVERED') return 'Delivered';
    if (s === 'FLAGGED' || s === 'REJECTED') return 'Flagged';
    return 'Active';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card className="p-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-white shadow-sm border-gray-100">
        <div className="flex w-full md:w-auto items-center gap-4">
          <div className="relative flex-1 md:w-80">
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
            {loading ? 'Loading...' : 'Track'}
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsScanning(!isScanning)}
            className="px-4 py-2 bg-teal-950 text-white font-medium rounded-lg hover:bg-teal-900 flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" /> {isScanning ? 'Cancel Scan' : 'Scan QR'}
          </button>
        </div>
      </Card>

      {error && (
        <Card className="p-6 text-center text-red-600">
          <p className="font-medium">{error}</p>
        </Card>
      )}

      {isScanning && (
        <Card className="p-8 text-center bg-gray-50 border-dashed">
          <div className="w-64 h-64 bg-gray-200 mx-auto rounded-lg flex items-center justify-center border-4 border-slate-300 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-teal-500 animate-[scan_2s_ease-in-out_infinite]"></div>
             <p className="text-gray-500 font-medium">Camera Feed</p>
          </div>
          <p className="mt-4 text-gray-600">Position QR code within the frame</p>
        </Card>
      )}

      {data && !isScanning && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{data.shipment_id}</h2>
                  <p className="text-gray-500">{data.product}</p>
                </div>
                <Badge variant={mapStatus(data.status) === 'Active' ? 'default' : mapStatus(data.status) === 'Delivered' ? 'success' : 'danger'}>
                  {data.status || 'CREATED'}
                </Badge>
              </div>

              {/* Progress Tracker */}
              <div className="mb-6 py-3 px-4 bg-gray-50 rounded-xl border border-gray-100">
                <ProgressTracker status={data.status} />
              </div>

              <div className="h-64 bg-slate-100 rounded-xl flex items-center justify-center mb-6 relative overflow-hidden border border-gray-200">
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                <div className="flex flex-col items-center gap-2 z-10">
                  <MapPin className="w-10 h-10 text-teal-600 animate-bounce" />
                  <div className="bg-white px-3 py-1 rounded-full shadow-md text-sm font-medium">
                    {data.status === 'DELIVERED' ? 'Delivered' : 'In Transit'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Source</p>
                  <p className="font-medium text-gray-900">{data.origin}</p>
                </div>
                <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <p className="text-sm text-gray-500 mb-1">Destination</p>
                  <p className="font-medium text-gray-900">{data.destination}</p>
                </div>
              </div>

              {data.blockchain_tx && (
                <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-100">
                  <p className="text-xs text-teal-700 font-medium">Blockchain TX</p>
                  <p className="text-xs font-mono text-teal-600 break-all">{data.blockchain_tx}</p>
                </div>
              )}
            </Card>

            {/* Route Weather Forecast */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-gray-400" /> Route Weather Forecast
              </h3>
              {loadingForecast ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
              ) : routeForecast.length > 0 ? (
                <div className="space-y-4">
                  {['origin', 'destination'].map((pointType) => {
                    const loc = pointType === 'origin' ? data.origin : data.destination;
                    const points = routeForecast.filter(f => f.location === loc);
                    if (points.length === 0) return null;
                    return (
                      <div key={pointType} className="border border-gray-100 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-medium text-sm text-gray-700 capitalize">
                          {pointType}: {loc}
                        </div>
                        <div className="divide-y divide-gray-50">
                          {points.map((pt, idx) => (
                            <div key={idx} className={`px-4 py-3 flex items-center justify-between ${pt.risk_level === 'high' ? 'bg-red-50/50' : pt.risk_level === 'medium' ? 'bg-amber-50/50' : ''}`}>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {format(parseISO(pt.timestamp.replace(' ', 'T')), 'MMM d, h:mm a')}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">{pt.description}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`font-bold ${pt.risk_level === 'high' ? 'text-red-600' : pt.risk_level === 'medium' ? 'text-amber-600' : 'text-gray-900'}`}>
                                  {pt.temperature}°C
                                </span>
                                {pt.risk_level === 'high' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No forecast data available.</p>
              )}
            </Card>
          </div>

          <div className="space-y-6">

            {/* ── Dynamic Live IoT Temperature Panel ── */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-gray-400" /> Temperature Monitor
                </h3>
                {liveShipmentId && (
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                    liveConnected
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      liveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                    }`} />
                    {liveConnected ? 'Live' : 'Waiting'}
                  </span>
                )}
              </div>

              {liveReading ? (() => {
                // ── Gauge math ──────────────────────────────────────────────
                const temp = liveReading.temperature_celsius;
                const safeMin = data?.min_temp_celsius ?? tempMin;
                const safeMax = data?.max_temp_celsius ?? tempMax;
                const breach = liveReading.is_breach;
                // Map temperature onto 0-100 scale within a ±30% margin outside safe range
                const rangeSpan = safeMax - safeMin;
                const margin = rangeSpan * 0.4;
                const displayMin = safeMin - margin;
                const displayMax = safeMax + margin;
                const fraction = Math.min(1, Math.max(0, (temp - displayMin) / (displayMax - displayMin)));
                // SVG arc: 240° sweep, starting from 150°
                const radius = 54;
                const cx = 70; const cy = 70;
                const startAngle = 150; const sweepAngle = 240;
                const toRad = (d: number) => (d * Math.PI) / 180;
                const arcX = (pct: number) => cx + radius * Math.cos(toRad(startAngle + sweepAngle * pct));
                const arcY = (pct: number) => cy + radius * Math.sin(toRad(startAngle + sweepAngle * pct));
                const arcPath = (from: number, to: number, color: string) => {
                  const large = (to - from) * sweepAngle > 180 ? 1 : 0;
                  return `M ${arcX(from)} ${arcY(from)} A ${radius} ${radius} 0 ${large} 1 ${arcX(to)} ${arcY(to)}`;
                };
                return (
                  <div>
                    {/* SVG Gauge */}
                    <div className="flex justify-center mb-2">
                      <svg width="140" height="100" viewBox="0 0 140 100">
                        {/* background track */}
                        <path d={arcPath(0, 1, '')} stroke="#e5e7eb" strokeWidth="10" fill="none" strokeLinecap="round" />
                        {/* colored fill up to current temp */}
                        <path
                          d={arcPath(0, fraction, '')}
                          stroke={breach ? '#ef4444' : '#10b981'}
                          strokeWidth="10" fill="none" strokeLinecap="round"
                          style={{ transition: 'all 0.8s ease' }}
                        />
                        {/* safe-min marker */}
                        <circle
                          cx={arcX((safeMin - displayMin) / (displayMax - displayMin))}
                          cy={arcY((safeMin - displayMin) / (displayMax - displayMin))}
                          r="4" fill="#6366f1"
                        />
                        {/* safe-max marker */}
                        <circle
                          cx={arcX((safeMax - displayMin) / (displayMax - displayMin))}
                          cy={arcY((safeMax - displayMin) / (displayMax - displayMin))}
                          r="4" fill="#6366f1"
                        />
                        {/* center temperature text */}
                        <text x="70" y="65" textAnchor="middle"
                          fontSize="22" fontWeight="800"
                          fill={breach ? '#ef4444' : '#111827'}>
                          {temp}°
                        </text>
                        <text x="70" y="80" textAnchor="middle" fontSize="8" fill="#9ca3af">
                          {breach ? 'BREACH' : 'SAFE'}
                        </text>
                      </svg>
                    </div>

                    {/* Safe range */}
                    <div className="flex justify-between text-xs text-gray-500 mb-3 px-1">
                      <span>Safe Min: <strong className="text-indigo-600">{safeMin}°C</strong></span>
                      <span>Safe Max: <strong className="text-indigo-600">{safeMax}°C</strong></span>
                    </div>

                    {/* Breach banner */}
                    {breach && (
                      <div className="mb-3 p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        Temperature breach! {temp}°C is outside safe range ({safeMin}°C – {safeMax}°C)
                      </div>
                    )}

                    {/* IoT Metadata */}
                    <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <div className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1"><Cpu className="w-3 h-3" /> Device</span>
                        <span className="font-mono font-medium">{liveReading.device_id || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</span>
                        <span className="font-medium">{liveReading.location || 'N/A'}</span>
                      </div>
                      {liveReading.latitude && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">GPS</span>
                          <span className="font-mono text-[10px]">{liveReading.latitude?.toFixed(4)}, {liveReading.longitude?.toFixed(4)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1"><Battery className="w-3 h-3" /> Battery</span>
                        <span className={`font-medium ${
                          (liveReading.battery_level ?? 100) < 20 ? 'text-red-600' :
                          (liveReading.battery_level ?? 100) < 50 ? 'text-amber-600' : 'text-emerald-600'
                        }`}>{liveReading.battery_level?.toFixed(1) ?? 'N/A'}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Updated</span>
                        <span>{formatDistanceToNow(new Date(liveReading.logged_at), { addSuffix: true })}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-gray-200">
                        <span className="text-gray-400">Source</span>
                        {liveReading.source === 'IOT_SENSOR' ? (
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold"><Wifi className="w-3 h-3" /> IOT SENSOR</span>
                        ) : (
                          <span className="text-amber-700 font-semibold">MANUAL</span>
                        )}
                      </div>
                    </div>

                    {/* Recent Readings */}
                    {tempLogs.length > 0 && (
                      <div className="mt-4 space-y-1.5">
                        <p className="text-xs font-semibold text-gray-500">Recent Readings ({tempLogs.length})</p>
                        {tempLogs.slice(0, 5).map((log: any, i: number) => (
                          <div key={i} className={`flex justify-between items-center text-xs py-1.5 px-2 rounded border ${
                            log.is_breach ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
                          }`}>
                            <span className={`font-bold ${log.is_breach ? 'text-red-600' : 'text-gray-800'}`}>
                              {log.temperature_celsius}°C
                            </span>
                            <span className="text-gray-500 truncate max-w-[70px]">{log.location || 'N/A'}</span>
                            {log.source === 'IOT_SENSOR' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">Sensor</span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">Manual</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })() : (
                // ── No live data yet ──
                <div className="text-center py-6">
                  <div className="relative w-32 h-24 mx-auto mb-3">
                    <svg width="128" height="96" viewBox="0 0 140 100">
                      <path
                        d={`M ${70 + 54 * Math.cos((150 * Math.PI) / 180)} ${70 + 54 * Math.sin((150 * Math.PI) / 180)} A 54 54 0 1 1 ${70 + 54 * Math.cos((30 * Math.PI) / 180)} ${70 + 54 * Math.sin((30 * Math.PI) / 180)}`}
                        stroke="#e5e7eb" strokeWidth="10" fill="none" strokeLinecap="round"
                      />
                      <text x="70" y="70" textAnchor="middle" fontSize="12" fill="#9ca3af" fontWeight="600">Waiting</text>
                      <text x="70" y="82" textAnchor="middle" fontSize="8" fill="#d1d5db">for sensor</text>
                    </svg>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 px-2 mb-2">
                    <span>Min: <strong>{tempMin}°C</strong></span>
                    <span>Max: <strong>{tempMax}°C</strong></span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {liveShipmentId
                      ? 'Run the IoT simulator to push live readings'
                      : 'Search for a shipment to see live data'}
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" /> Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created:</span>
                  <span className="font-medium">
                    {data.created_at ? formatDistanceToNow(new Date(data.created_at), { addSuffix: true }) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="font-medium text-teal-600">
                    {data.updated_at ? formatDistanceToNow(new Date(data.updated_at), { addSuffix: true }) : 'Just now'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Risk Level:</span>
                  <RiskBadge score={data.risk_score ?? 0} />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Events:</span>
                  <span className="font-medium">{data.events?.length ?? 0}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
