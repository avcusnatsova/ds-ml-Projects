import { useState } from 'react';
import { Card, ProgressTracker } from '../../components/ui';
import { QrCode, ShieldCheck, MapPin, FileCheck, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { submitCustomsClearance } from '../../api/shipmentApi';

export function CustomsDashboard() {
  const [shipmentId, setShipmentId] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await submitCustomsClearance(shipmentId, {
        location,
        clearance_status: status,
        notes: notes || undefined,
        officer_name: officerName || 'Customs Officer',
      });

      if (res.success) {
        setResult(res.data);
      } else {
        setError(res.error || 'Failed to record clearance');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShipmentId('');
    setLocation('');
    setStatus('');
    setNotes('');
    setOfficerName('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Result */}
      {result && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <Card className="overflow-hidden">
            <div className={`p-6 text-white text-center ${
              result.clearance_status === 'CLEARED' ? 'bg-green-600' :
              result.clearance_status === 'HELD' ? 'bg-amber-500' :
              'bg-red-600'
            }`}>
              {result.clearance_status === 'CLEARED' && <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-80" />}
              {result.clearance_status === 'HELD' && <Clock className="w-12 h-12 mx-auto mb-3 opacity-80" />}
              {result.clearance_status === 'REJECTED' && <XCircle className="w-12 h-12 mx-auto mb-3 opacity-80" />}
              <h2 className="text-2xl font-black uppercase tracking-wide">
                Customs {result.clearance_status}
              </h2>
              <p className="text-sm opacity-90 mt-1">Shipment {result.shipment_id}</p>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <ProgressTracker status={result.status} />
              </div>
              {result.blockchain_tx && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs font-mono text-gray-600 break-all mb-4">
                  <span className="text-gray-400 font-sans font-medium">Blockchain TX:</span> {result.blockchain_tx}
                </div>
              )}
              <button onClick={resetForm} className="w-full py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
                Process Another Shipment
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Form */}
      {!result && (
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Customs Clearance</h2>
              <p className="text-sm text-gray-500">Record border checkpoint clearance decision to the blockchain</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="absolute top-0 left-0 w-full h-1 bg-teal-500 animate-[scan_2s_ease-in-out_infinite]"></div>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Checkpoint Location
                </label>
                <input required type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="e.g. JFK Airport Customs" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <FileCheck className="w-4 h-4" /> Clearance Decision
                </label>
                <select required value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white">
                  <option value="">Select decision...</option>
                  <option value="Cleared">✅ Cleared for Import/Export</option>
                  <option value="Held">⏳ Held for Inspection</option>
                  <option value="Rejected">❌ Rejected</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Officer Name</label>
              <input type="text" value={officerName} onChange={e => setOfficerName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="e.g. Officer J. Smith" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Inspection Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" placeholder="All seals intact, documentation verified against blockchain..." />
              {error && <p className="text-sm text-red-600 mt-2 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> {error}</p>}
            </div>

            {/* Preview: show what will happen */}
            {status && (
              <div className={`p-4 rounded-lg border ${
                status === 'Cleared' ? 'bg-green-50 border-green-200 text-green-800' :
                status === 'Held' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                status === 'Rejected' ? 'bg-red-50 border-red-200 text-red-800' :
                'bg-gray-50 border-gray-200 text-gray-800'
              }`}>
                <p className="text-sm font-medium">
                  {status === 'Cleared' && '✅ Shipment will be marked as AT_CUSTOMS (cleared) and allowed to proceed.'}
                  {status === 'Held' && '⚠️ Shipment will be FLAGGED and a CUSTOMS_HELD alert will be raised.'}
                  {status === 'Rejected' && '🚫 Shipment will be FLAGGED and a CUSTOMS_REJECTED critical alert will be raised.'}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading || !shipmentId}
                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Anchoring to Blockchain...' : 'Submit Clearance Decision'}
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
