import { useState } from 'react';
import { Card } from '../components/ui';
import {
  FileText, ShieldCheck, ShieldAlert, Upload, Search,
  AlertTriangle, CheckCircle2, Hash, Link2, Loader2, RefreshCw
} from 'lucide-react';
import { uploadDocument, listDocuments } from '../api/shipmentApi';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

interface DocRecord {
  filename: string;
  sha256_hash: string;
  blockchain_tx?: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
}

interface VerifyResult {
  verified: boolean;
  filename: string;
  stored_hash: string;
  recomputed_hash: string;
  db_match: boolean;
  blockchain_match: boolean;
}

type FlowStep = 'idle' | 'uploading' | 'uploaded' | 'verifying' | 'result';

export function TamperDetection() {
  const { role } = useAuth();

  // Step 1 — Upload
  const [shipmentId, setShipmentId] = useState('');
  const [step, setStep] = useState<FlowStep>('idle');
  const [uploadedDoc, setUploadedDoc] = useState<DocRecord | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shipment docs list
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchDocs = async () => {
    const sid = shipmentId.trim();
    if (!sid) return;
    setLoadingDocs(true);
    try {
      const res = await listDocuments(sid);
      if (res.success) setDocs(res.data || []);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    const sid = shipmentId.trim();
    if (!files || !sid) {
      alert('Enter a Shipment ID first');
      return;
    }
    setStep('uploading');
    setError(null);
    try {
      const res = await uploadDocument(shipmentId, files[0], role || 'Supplier');
      if (res.success) {
        setUploadedDoc(res.data);
        setStep('uploaded');
        fetchDocs();
      } else {
        setError(res.error || 'Upload failed');
        setStep('idle');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
      setStep('idle');
    }
  };

  const handleVerifyDoc = async (doc: DocRecord) => {
    const sid = shipmentId.trim();
    setStep('verifying');
    setVerifyResult(null);
    setError(null);
    try {
      const res = await api.post(`/api/documents/${sid}/verify/${encodeURIComponent(doc.sha256_hash)}`);
      const d = res.data?.data;
      setVerifyResult(d);
      setStep('result');
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || 'Verification failed');
      setStep('uploaded');
    }
  };

  const reset = () => {
    setStep('idle');
    setUploadedDoc(null);
    setVerifyResult(null);
    setError(null);
  };

  const hashShort = (h: string) => h ? h.slice(0, 18) + '…' + h.slice(-6) : 'N/A';

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Document Tamper Detection</h2>
            <p className="text-sm text-gray-500">Upload a document. Then verify it. If it's been changed, we'll catch it.</p>
          </div>
        </div>

        {/* Shipment ID row */}
        <div className="flex gap-3 items-end mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 block mb-1">Shipment ID</label>
            <input
              type="text"
              value={shipmentId}
              onChange={e => setShipmentId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchDocs()}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              placeholder="e.g. SHP-001"
            />
          </div>
          <button
            onClick={fetchDocs}
            disabled={!shipmentId.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
          >
            {loadingDocs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Load Docs
          </button>
        </div>

        {/* Upload Zone */}
        <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${step === 'uploading' ? 'border-teal-400 bg-teal-50' : 'border-gray-300 hover:border-teal-400 hover:bg-teal-50/30'}`}>
          {step === 'uploading' ? (
            <>
              <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
              <p className="text-teal-700 font-medium">Hashing & anchoring to blockchain…</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400" />
              <p className="text-gray-700 font-medium">Drop a document here or click to upload</p>
              <p className="text-gray-400 text-sm">PDF, JPG, PNG (max 10MB) — will be SHA-256 hashed and anchored</p>
            </>
          )}
          <input type="file" className="hidden" disabled={step === 'uploading' || !shipmentId.trim()} onChange={e => handleUpload(e.target.files)} />
        </label>

        {!shipmentId.trim() && (
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Enter a Shipment ID before uploading.</p>
        )}
      </Card>

      {/* Uploaded confirmation */}
      {step === 'uploaded' && uploadedDoc && (
        <Card className="p-6 border-l-4 border-green-500 bg-green-50/30 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-green-800 text-lg">Document Anchored to Blockchain</h3>
              <p className="text-sm text-green-700 mt-1">{uploadedDoc.filename}</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> SHA-256 Fingerprint</p>
                  <p className="font-mono text-xs text-gray-800 break-all">{uploadedDoc.sha256_hash}</p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-green-100">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1 flex items-center gap-1"><Link2 className="w-3 h-3" /> Blockchain TX</p>
                  <p className="font-mono text-xs text-gray-800 truncate">{uploadedDoc.blockchain_tx || 'Stored off-chain'}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2">
                ⚡ <strong>Demo tip:</strong> Now modify the file and re-upload it below to trigger a tamper alert.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Documents List */}
      {docs.length > 0 && (
        <Card className="overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /> Documents on Shipment {shipmentId}</h3>
            <button onClick={fetchDocs} className="text-gray-400 hover:text-gray-600"><RefreshCw className="w-4 h-4" /></button>
          </div>
          <div className="divide-y divide-gray-50">
            {docs.map((doc, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-8 h-8 text-teal-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-xs font-mono text-gray-400 truncate">{hashShort(doc.sha256_hash)}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleVerifyDoc(doc)}
                  disabled={step === 'verifying'}
                  className="ml-4 shrink-0 flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {step === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Verify Integrity
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Verifying overlay */}
      {step === 'verifying' && (
        <Card className="p-12 text-center animate-pulse">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-teal-100 rounded-full" />
            <div className="absolute inset-0 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <ShieldCheck className="w-8 h-8 text-teal-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Comparing Hash Against Blockchain…</h3>
          <p className="text-gray-500 mt-1">Re-computing SHA-256 and cross-checking on-chain fingerprint</p>
        </Card>
      )}

      {/* Verification Result */}
      {step === 'result' && verifyResult && (
        <div className="animate-in slide-in-from-bottom-6 duration-500 space-y-4">
          {/* Verdict Banner */}
          <div className={`w-full p-8 rounded-2xl shadow-lg text-white flex flex-col sm:flex-row items-center justify-between gap-6 ${verifyResult.verified ? 'bg-green-500' : 'bg-red-600'}`}>
            <div className="flex items-center gap-4">
              {verifyResult.verified
                ? <CheckCircle2 className="w-16 h-16 text-green-100 shrink-0" />
                : <ShieldAlert className="w-16 h-16 text-red-200 shrink-0 animate-pulse" />
              }
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {verifyResult.verified ? '✅ DOCUMENT INTACT' : '🚨 TAMPERING DETECTED'}
                </h2>
                <p className={`mt-1 font-medium ${verifyResult.verified ? 'text-green-100' : 'text-red-100'}`}>
                  {verifyResult.verified
                    ? 'Fingerprint matches blockchain record. Document is authentic.'
                    : 'Hash mismatch! This document has been modified after blockchain anchoring. A CRITICAL alert has been raised.'}
                </p>
              </div>
            </div>
            <button onClick={reset} className="px-5 py-2.5 bg-white/20 hover:bg-white/30 rounded-lg font-semibold text-sm transition-colors shrink-0">
              Run Another
            </button>
          </div>

          {/* Hash Comparison Card */}
          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4 text-lg flex items-center gap-2"><Hash className="w-5 h-5 text-teal-600" /> Cryptographic Hash Comparison</h3>
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border-2 ${verifyResult.db_match ? 'border-green-200 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">Stored Hash (MongoDB)</p>
                  {verifyResult.db_match
                    ? <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ MATCH</span>
                    : <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">✗ MISMATCH</span>
                  }
                </div>
                <p className="font-mono text-xs break-all text-gray-800">{verifyResult.stored_hash}</p>
              </div>

              <div className={`p-4 rounded-xl border-2 ${verifyResult.db_match ? 'border-green-200 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">Re-computed Hash (Live File)</p>
                  {verifyResult.db_match
                    ? <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ MATCH</span>
                    : <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">✗ MISMATCH</span>
                  }
                </div>
                <p className="font-mono text-xs break-all text-gray-800">{verifyResult.recomputed_hash}</p>
              </div>

              <div className={`p-4 rounded-xl border-2 ${verifyResult.blockchain_match ? 'border-green-200 bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Blockchain Verification</p>
                  {verifyResult.blockchain_match
                    ? <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">✓ ON-CHAIN MATCH</span>
                    : <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">✗ NOT ON-CHAIN</span>
                  }
                </div>
                <p className="text-xs text-gray-500">Smart contract confirms {verifyResult.blockchain_match ? 'this hash was anchored at upload time.' : 'this hash was NEVER recorded on-chain — document may be counterfeit.'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
        </div>
      )}
    </div>
  );
}
