import { useState } from 'react';
import { Card, Badge } from '../components/ui';
import { FileUp, FileText, ShieldCheck, X, AlertTriangle } from 'lucide-react';
import { uploadDocument } from '../api/shipmentApi';
import { useAuth } from '../context/AuthContext';

interface UploadedFile {
  name: string;
  size: string;
  hash: string;
  status: 'uploading' | 'stored' | 'error';
  blockchainTx?: string;
  error?: string;
}

export function UploadDocuments() {
  const { role } = useAuth();
  const [shipmentId, setShipmentId] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleUpload = async (newFiles: FileList | null) => {
    if (!newFiles || !shipmentId.trim()) {
      alert('Please enter a Shipment ID first');
      return;
    }

    for (const file of Array.from(newFiles)) {
      const mockFile: UploadedFile = {
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB',
        hash: 'Uploading...',
        status: 'uploading',
      };
      setFiles(prev => [...prev, mockFile]);

      try {
        const response = await uploadDocument(shipmentId, file, role || 'Supplier');
        if (response.success) {
          setFiles(prev =>
            prev.map(f =>
              f.name === file.name && f.status === 'uploading'
                ? {
                    ...f,
                    hash: response.data?.sha256_hash || 'N/A',
                    blockchainTx: response.data?.blockchain_tx || undefined,
                    status: 'stored',
                  }
                : f
            )
          );
        } else {
          setFiles(prev =>
            prev.map(f =>
              f.name === file.name && f.status === 'uploading'
                ? { ...f, status: 'error', error: response.error || 'Upload failed' }
                : f
            )
          );
        }
      } catch (err: any) {
        setFiles(prev =>
          prev.map(f =>
            f.name === file.name && f.status === 'uploading'
              ? { ...f, status: 'error', error: err.message || 'Network error' }
              : f
          )
        );
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleUpload(e.dataTransfer.files);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <FileUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Compliance Documents</h2>
            <p className="text-sm text-gray-500">Documents are hashed and stored immutably on the blockchain.</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Target Shipment ID</label>
              <input 
                type="text" 
                value={shipmentId}
                onChange={(e) => setShipmentId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none" 
                placeholder="e.g. SHP-9021" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Document Category</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none bg-white">
                <option>Certificate of Origin</option>
                <option>Pharma Grade Compliance</option>
                <option>Customs Clearance</option>
                <option>Handoff Bill of Lading</option>
                <option>Quality Inspection Report</option>
              </select>
            </div>
          </div>

          <div 
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
              isDragging ? 'border-teal-500 bg-teal-50' : 'border-gray-300 hover:border-teal-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <FileUp className="w-10 h-10 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-700 font-medium mb-1">Drag and drop documents here</p>
            <p className="text-gray-500 text-sm mb-4">PDF, JPG, PNG (max 10MB)</p>
            <label className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 font-medium inline-block">
              Browse Files
              <input type="file" multiple className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </label>
          </div>

          {files.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Uploaded Documents</h3>
              <div className="space-y-3">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg bg-gray-50/50">
                    <FileText className="w-8 h-8 text-teal-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <span className="text-xs text-gray-500">{file.size}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {file.status === 'uploading' ? (
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1 animate-pulse">
                            Uploading & hashing on blockchain...
                          </span>
                        ) : file.status === 'error' ? (
                          <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4" /> {file.error}
                          </span>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-mono text-gray-500 truncate w-48 sm:w-auto" title={file.hash}>
                              {file.hash}
                            </span>
                            <Badge variant="success">Blockchain Stored</Badge>
                          </>
                        )}
                      </div>
                      {file.blockchainTx && (
                        <p className="text-[10px] font-mono text-gray-400 mt-1 truncate" title={file.blockchainTx}>
                          TX: {file.blockchainTx}
                        </p>
                      )}
                    </div>
                    <button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-500">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
