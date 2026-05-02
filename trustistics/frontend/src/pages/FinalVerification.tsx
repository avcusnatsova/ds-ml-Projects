import { useState } from 'react';
import { Card, RiskBadge } from '../components/ui';
import { ShieldCheck, Search, FileText, Thermometer, Box, AlertTriangle, ShieldAlert, CheckCircle } from 'lucide-react';
import { fullVerify, type VerificationResult } from '../api/shipmentApi';

export function FinalVerification() {
  const [shipmentId, setShipmentId] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!shipmentId.trim()) return;
    setIsVerifying(true);
    setResult(null);
    setError(null);

    try {
      const res = await fullVerify(shipmentId);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || res.message || 'Verification failed');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err.message || 'Network error');
    } finally {
      setIsVerifying(false);
    }
  };

  const isApproved = result?.verdict === 'APPROVED';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {!result && !error && (
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
            <div className="p-3 bg-teal-950 text-white rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Final Verification Point</h2>
              <p className="text-sm text-gray-500">Enter shipment ID to perform full blockchain audit before acceptance</p>
            </div>
          </div>

          <div className="max-w-xl mx-auto space-y-8 py-8">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-lg transition-all" 
                placeholder="Enter Shipment ID..." 
              />
            </div>

            <div className="flex gap-4 justify-center">
              <button 
                onClick={handleVerify}
                disabled={isVerifying || !shipmentId.trim()}
                className="px-8 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors w-64 flex justify-center items-center gap-2 disabled:opacity-70"
              >
                {isVerifying ? <span className="animate-pulse">Auditing Blockchain...</span> : 'Run Full Verification'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {isVerifying && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-teal-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-teal-600 rounded-full border-t-transparent animate-spin"></div>
              <ShieldCheck className="w-10 h-10 text-teal-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Auditing Blockchain...</h3>
              <p className="text-gray-500">Verifying smart contracts, documents, and sensor logs</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <Card className="p-8 text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Verification Error</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => { setError(null); setResult(null); }} className="px-6 py-2 border-2 border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50">
            Try Again
          </button>
        </Card>
      )}

      {result && isApproved && (
        <div className="animate-in slide-in-from-bottom-8 duration-500">
          <div className="w-full bg-green-500 text-white p-8 rounded-t-2xl shadow-lg flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="w-24 h-24 text-green-100 animate-[bounce_1s_ease-in-out_2]" />
            <h1 className="text-5xl font-black tracking-tight">SHIPMENT VERIFIED</h1>
            <p className="text-green-100 text-xl font-medium max-w-2xl">
              All blockchain records have been mathematically proven. Safe to accept.
            </p>
          </div>
          <Card className="rounded-t-none border-t-0 p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`p-6 rounded-xl flex items-start gap-4 ${result.document_check === 'PASS' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
                <FileText className={`w-8 h-8 shrink-0 ${result.document_check === 'PASS' ? 'text-green-600' : 'text-amber-600'}`} />
                <div>
                  <h3 className="font-bold text-lg mb-1">Document Integrity</h3>
                  <p className="text-sm">{result.document_check || 'N/A'}</p>
                </div>
              </div>
              <div className={`p-6 rounded-xl flex items-start gap-4 ${result.temperature_check === 'PASS' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
                <Thermometer className={`w-8 h-8 shrink-0 ${result.temperature_check === 'PASS' ? 'text-green-600' : 'text-amber-600'}`} />
                <div>
                  <h3 className="font-bold text-lg mb-1">Temperature Logs</h3>
                  <p className="text-sm">{result.temperature_check || 'N/A'}</p>
                </div>
              </div>
              <div className={`p-6 rounded-xl flex items-start gap-4 ${result.custody_check === 'PASS' ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'}`}>
                <Box className={`w-8 h-8 shrink-0 ${result.custody_check === 'PASS' ? 'text-green-600' : 'text-amber-600'}`} />
                <div>
                  <h3 className="font-bold text-lg mb-1">Chain of Custody</h3>
                  <p className="text-sm">{result.custody_check || 'N/A'}</p>
                </div>
              </div>
            </div>

            {result.reasons && result.reasons.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <p className="font-medium text-gray-700 mb-2">Details:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {result.reasons.map((r, i) => <li key={i}>• {r}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-500">
              <span>Risk Level:</span>
              <RiskBadge score={result.risk_score ?? 0} />
              <span>• Verified at: {result.verified_at || 'N/A'}</span>
            </div>
            
            <div className="mt-8 flex justify-center">
              <button onClick={() => { setResult(null); setShipmentId(''); }} className="px-6 py-2 border-2 border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50">
                Verify Another Shipment
              </button>
            </div>
          </Card>
        </div>
      )}

      {result && !isApproved && (
        <div className="animate-in slide-in-from-bottom-8 duration-500">
          <div className="w-full bg-red-600 text-white p-8 rounded-t-2xl shadow-lg flex flex-col items-center justify-center text-center space-y-4">
            <ShieldAlert className="w-24 h-24 text-red-200 animate-pulse" />
            <h1 className="text-5xl font-black tracking-tight">SHIPMENT FLAGGED</h1>
            <p className="text-red-100 text-xl font-medium max-w-2xl">
              Anomalies detected during blockchain audit. Review before accepting.
            </p>
          </div>
          <Card className="rounded-t-none border-t-0 p-8 shadow-xl">
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">Issues Found</h2>
              <div className="space-y-3">
                {result.reasons?.map((reason, i) => (
                  <div key={i} className="p-4 bg-red-50 border border-red-100 rounded-lg flex gap-3">
                    <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
                    <p className="text-red-700 text-sm">{reason}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className={`p-6 rounded-xl flex items-start gap-4 ${result.document_check === 'PASS' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <FileText className={`w-8 h-8 shrink-0 ${result.document_check === 'PASS' ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <h3 className="font-bold text-lg mb-1">Documents</h3>
                  <p className="font-bold text-sm">{result.document_check || 'N/A'}</p>
                </div>
              </div>
              <div className={`p-6 rounded-xl flex items-start gap-4 ${result.temperature_check === 'PASS' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <Thermometer className={`w-8 h-8 shrink-0 ${result.temperature_check === 'PASS' ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <h3 className="font-bold text-lg mb-1">Temperature</h3>
                  <p className="font-bold text-sm">{result.temperature_check || 'N/A'}</p>
                </div>
              </div>
              <div className={`p-6 rounded-xl flex items-start gap-4 ${result.custody_check === 'PASS' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
                <Box className={`w-8 h-8 shrink-0 ${result.custody_check === 'PASS' ? 'text-green-600' : 'text-red-600'}`} />
                <div>
                  <h3 className="font-bold text-lg mb-1">Custody</h3>
                  <p className="font-bold text-sm">{result.custody_check || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-gray-500">
              <span>Risk Level:</span>
              <RiskBadge score={result.risk_score ?? 0} />
            </div>
            
            <div className="mt-8 flex justify-center gap-4">
              <button onClick={() => { setResult(null); setShipmentId(''); }} className="px-6 py-2 border-2 border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50">
                Verify Another
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
