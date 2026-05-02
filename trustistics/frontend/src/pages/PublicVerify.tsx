import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldCheck, ShieldAlert, CheckCircle, XCircle, 
  MapPin, Clock, FileText, Loader2, Copy, Check, CloudRain, AlertTriangle
} from 'lucide-react';

import { 
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer 
} from 'recharts';
import { ProgressTracker } from '../components/ui';

const MOCK_APPROVED = {
  shipmentId: "SHP-001",
  product: "Pfizer Vaccine",
  origin: "Mumbai",
  destination: "Delhi",
  createdAt: "2024-01-01T10:00:00Z",
  safeMinTemp: -80,
  safeMaxTemp: -60,
  overallStatus: "approved",
  spoilageRisk: 12,
  documents: [
    { name: "Origin Certificate", hash: "0x4a2b...91c8", verified: true },
    { name: "Customs Clearance", hash: "0x8f1d...3e7b", verified: true }
  ],
  handoffs: [
    {
      role: "Supplier",
      handler: "PharmaCo Mumbai",
      timestamp: "2024-01-01T10:00:00Z",
      location: "Mumbai Warehouse",
      condition: "Good",
      blockchainTx: "0xabc1234567890"
    },
    {
      role: "Driver",
      handler: "ColdFreight Inc",
      timestamp: "2024-01-01T14:30:00Z",
      location: "Highway 4",
      condition: "Good",
      blockchainTx: "0xdef1234567890"
    }
  ],
  temperatureLogs: [
    { timestamp: "10:00", temperature: -75 },
    { timestamp: "11:00", temperature: -72 },
    { timestamp: "12:00", temperature: -73 },
    { timestamp: "13:00", temperature: -74 },
    { timestamp: "14:00", temperature: -71 }
  ],
  climate_alerts: [],
  flagReasons: []
};


const MOCK_FLAGGED = {
  ...MOCK_APPROVED,
  shipmentId: "SHP-002",
  overallStatus: "flagged",
  spoilageRisk: 85,
  documents: [
    { name: "Origin Certificate", hash: "0x4a2b...91c8", verified: true },
    { name: "Customs Clearance", hash: "0x8f1d...3e7b", verified: false }
  ],
  handoffs: [
    {
      role: "Supplier",
      handler: "PharmaCo Mumbai",
      timestamp: "2024-01-01T10:00:00Z",
      location: "Mumbai Warehouse",
      condition: "Good",
      blockchainTx: "0xabc1234567890"
    },
    {
      role: "Driver",
      handler: "ColdFreight Inc",
      timestamp: "2024-01-01T14:30:00Z",
      location: "Highway 4",
      condition: "Damaged packaging",
      blockchainTx: "0xdef1234567890"
    }
  ],
  temperatureLogs: [
    { timestamp: "10:00", temperature: -75 },
    { timestamp: "11:00", temperature: -72 },
    { timestamp: "12:00", temperature: -55 }, // Breach
    { timestamp: "13:00", temperature: -40 }, // Breach
    { timestamp: "14:00", temperature: -71 }
  ],
  climate_alerts: [
    {
      alert_type: "Climate Risk",
      message: "External temp 46°C may overwhelm cooling unit",
      created_at: "2024-01-01T12:00:00Z",
      location: "Nagpur"
    }
  ],
  flagReasons: [
    "Temperature exceeded safe maximum (-60°C) at 12:00.",
    "Customs Clearance document verification failed on blockchain.",
    "Handler reported damaged packaging.",
    "Climate Risk: External temp 46°C may overwhelm cooling unit"
  ]
};


export function PublicVerify() {
  const { shipmentId } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [useMock, setUseMock] = useState<'none' | 'approved' | 'flagged'>('none');
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (useMock === 'approved') {
        setData(MOCK_APPROVED);
        setLoading(false);
        setError(false);
        return;
      }
      if (useMock === 'flagged') {
        setData(MOCK_FLAGGED);
        setLoading(false);
        setError(false);
        return;
      }

      setLoading(true);
      setError(false);
      try {
        const response = await axios.get(`http://${window.location.hostname}:8000/api/verify/${shipmentId}`);
        if (response.data.success) {
          setData(response.data.data);
        } else {
          setError(true);
        }
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [shipmentId, useMock]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Verifying shipment on blockchain...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans relative">
        <div className="absolute top-4 right-4 flex gap-2">
          <button onClick={() => setUseMock('approved')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded shadow">Mock Safe</button>
          <button onClick={() => setUseMock('flagged')} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded shadow">Mock Flag</button>
        </div>
        <ShieldAlert className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Shipment not found.</h1>
        <p className="text-gray-500 text-center">Please check the QR code and try again.</p>
      </div>
    );
  }

  const isApproved = data.overallStatus === 'approved';

  // Format dates
  const createdDate = new Date(data.createdAt).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Risk Score Color
  const riskColor = data.spoilageRisk < 30 ? 'text-green-600' : data.spoilageRisk <= 70 ? 'text-amber-500' : 'text-red-600';

  // Checklist
  const allDocsVerified = data.documents.every((d: any) => d.verified);
  const noMissingHandoffs = true; // Assuming handoffs complete if not explicitly flagged for it
  const noTempBreaches = data.temperatureLogs.every((t: any) => t.temperature >= data.safeMinTemp && t.temperature <= data.safeMaxTemp);

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-10 relative">
      {/* Dev Toggle */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button onClick={() => setUseMock('approved')} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded shadow hover:bg-green-200">Mock: Safe</button>
        <button onClick={() => setUseMock('flagged')} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded shadow hover:bg-red-200">Mock: Flag</button>
      </div>

      {/* 1. Header strip */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          <span className="font-bold text-gray-900 tracking-tight">Trustistics</span>
        </div>
        <div className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {data.shipmentId}
        </div>
      </header>

      {/* 2. Final verdict banner */}
      <div className={`w-full py-6 px-4 shadow-sm flex flex-col items-center justify-center text-center text-white ${isApproved ? 'bg-green-600' : 'bg-red-600'}`}>
        {isApproved ? (
          <CheckCircle className="w-16 h-16 mb-3 text-green-200" />
        ) : (
          <ShieldAlert className="w-16 h-16 mb-3 text-red-200" />
        )}
        <h1 className="text-2xl font-black uppercase tracking-wider mb-1">
          {isApproved ? 'Shipment Verified' : 'Shipment Flagged'}
        </h1>
        <p className="text-base font-medium opacity-90">
          {isApproved ? 'Safe to Receive' : 'Do Not Accept'}
        </p>

        {!isApproved && data.flagReasons && data.flagReasons.length > 0 && (
          <div className="mt-4 w-full max-w-md bg-red-700/50 rounded-lg p-3 text-left">
            <p className="text-sm font-bold mb-2 uppercase text-red-100">Flags Detected:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              {data.flagReasons.map((reason: string, i: number) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <main className="max-w-md mx-auto px-4 mt-6 space-y-6">

        {/* Progress Tracker */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">Shipment Journey</h3>
          <ProgressTracker status={data.status || 'CREATED'} />
        </section>

        {/* Customs Status Banner */}
        {data.customs_status && (
          <section className={`rounded-xl shadow-sm p-5 border ${
            data.customs_status === 'CLEARED' ? 'bg-green-50 border-green-200' :
            data.customs_status === 'HELD' ? 'bg-amber-50 border-amber-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {data.customs_status === 'CLEARED' && <CheckCircle className="w-6 h-6 text-green-600" />}
              {data.customs_status === 'HELD' && <Clock className="w-6 h-6 text-amber-600" />}
              {data.customs_status === 'REJECTED' && <XCircle className="w-6 h-6 text-red-600" />}
              <div>
                <h3 className={`font-bold text-sm uppercase tracking-wide ${
                  data.customs_status === 'CLEARED' ? 'text-green-800' :
                  data.customs_status === 'HELD' ? 'text-amber-800' :
                  'text-red-800'
                }`}>
                  Customs: {data.customs_status}
                </h3>
                {data.customs_location && (
                  <p className="text-xs text-gray-600 mt-0.5">{data.customs_location}</p>
                )}
                {data.customs_notes && (
                  <p className="text-xs text-gray-500 mt-1">{data.customs_notes}</p>
                )}
                {data.customs_officer && (
                  <p className="text-xs text-gray-400 mt-0.5">Officer: {data.customs_officer}</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* 3. Shipment summary card */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{data.product}</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-900 font-medium">{data.origin} <span className="text-gray-400 font-normal">to</span> {data.destination}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">{createdDate}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                <span className="text-gray-400 text-lg font-bold">°C</span>
              </div>
              <div>
                <p className="text-sm text-gray-600">Safe Range: <span className="font-medium text-gray-900">{data.safeMinTemp}°C to {data.safeMaxTemp}°C</span></p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Trust checklist */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">Trust Checklist</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Document Integrity</span>
              {allDocsVerified ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Custody Chain</span>
              {noMissingHandoffs ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Temperature Compliance</span>
              {noTempBreaches ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1">
              <span className="text-sm font-medium text-gray-900">Spoilage Risk Score</span>
              <span className={`text-lg font-bold ${riskColor}`}>{data.spoilageRisk}/100</span>
            </div>
          </div>
        </section>

        {/* 5. Custody timeline */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-5">Custody Timeline</h3>
          <div className="relative pl-6 space-y-8">
            <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-gray-200"></div>
            {data.handoffs.map((handoff: any, idx: number) => {
              const dateObj = new Date(handoff.timestamp);
              const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' });
              const isBadCondition = handoff.condition && handoff.condition !== 'Good';
              return (
                <div key={idx} className="relative">
                  <div className={`absolute -left-[31px] p-1 rounded-full border-2 border-white ${isBadCondition ? 'bg-amber-500' : 'bg-blue-500'}`}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${isBadCondition ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                        {handoff.role}
                      </span>
                      <span className="text-xs text-gray-500">{dateStr}, {timeStr}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{handoff.handler !== 'System' ? handoff.handler : handoff.role.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-600">{handoff.location}</p>
                    {handoff.location && handoff.location.includes('Warehouse - ') && (
                      <p className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded mt-1 inline-block border border-indigo-100">
                        Cold Room: {handoff.location.replace('Warehouse - ', '')}
                      </p>
                    )}
                    {isBadCondition && (
                      <p className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded mt-1 inline-block border border-amber-100">
                        Condition: {handoff.condition}
                      </p>
                    )}
                    {handoff.blockchainTx && (
                      <div 
                        onClick={() => copyToClipboard(handoff.blockchainTx)}
                        className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded cursor-pointer hover:bg-gray-100 w-fit"
                      >
                        Tx: {handoff.blockchainTx.substring(0, 16)}...
                        {copiedTx === handoff.blockchainTx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Awaiting Delivery Node */}
            <div className="relative">
               <div className="absolute -left-[29px] w-2.5 h-2.5 rounded-full border-2 border-gray-300 bg-white"></div>
               <p className="text-sm font-medium text-gray-400 italic">Awaiting Delivery</p>
            </div>
          </div>
        </section>

        {/* 5b. Climate Summary */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CloudRain className="w-5 h-5 text-gray-400" /> Climate Summary
          </h3>
          {data.climate_alerts && data.climate_alerts.length > 0 ? (
            <div className="space-y-3">
              {data.climate_alerts.map((alert: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Weather risk detected in transit</p>
                    <p className="text-xs text-blue-800 mt-1">{alert.message}</p>
                    {alert.created_at && (
                      <p className="text-[10px] text-blue-600 mt-1 font-mono">
                        {new Date(alert.created_at).toLocaleDateString()} {new Date(alert.created_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
              <p className="text-sm font-medium text-green-800">No weather risks detected during transit.</p>
            </div>
          )}
        </section>

        {/* 6. Temperature history chart */}

        {data.temperatureLogs && data.temperatureLogs.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 overflow-hidden">
            <h3 className="font-bold text-gray-900 mb-4">Temperature History</h3>
            <div className="h-48 w-full -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.temperatureLogs} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 10, fill: '#9ca3af' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    domain={[data.safeMinTemp - 10, data.safeMaxTemp + 10]} 
                    tick={{ fontSize: 10, fill: '#9ca3af' }} 
                    axisLine={false} 
                    tickLine={false} 
                    width={40}
                  />
                  <ReferenceLine y={data.safeMaxTemp} stroke="#ef4444" strokeDasharray="3 3" />
                  <ReferenceLine y={data.safeMinTemp} stroke="#ef4444" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#0284c7" 
                    strokeWidth={2}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const isOut = payload.temperature < data.safeMinTemp || payload.temperature > data.safeMaxTemp;
                      return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={isOut ? 4 : 2} fill={isOut ? '#ef4444' : '#0284c7'} />;
                    }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* 7. Document integrity section */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-4">Document Integrity</h3>
          <div className="space-y-3">
            {data.documents.map((doc: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg bg-gray-50/50">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                    <p className="text-[10px] text-gray-500 font-mono truncate">Hash: {doc.hash}</p>
                  </div>
                </div>
                {doc.verified ? (
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 ml-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 shrink-0 ml-2" />
                )}
              </div>
            ))}
            <p className="text-[10px] text-gray-400 text-center mt-3 uppercase tracking-wide">Hashes verified against blockchain record</p>
          </div>
        </section>

      </main>

      {/* 8. Footer */}
      <footer className="mt-8 pb-6 text-center px-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Powered by Trustistics</p>
        <p className="text-[10px] text-gray-400">Tamper-proof cold chain verification</p>
        <p className="text-[10px] text-gray-400 mt-2">Verified at: {new Date().toLocaleString()}</p>
      </footer>

    </div>
  );
}
