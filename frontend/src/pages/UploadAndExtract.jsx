// ============================================================
// pages/UploadAndExtract.jsx — Drag & Drop Upload + Split-Screen Extraction
// Left: Document viewer (iframe/img) | Right: Editable extracted fields
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import {
  Upload, FileText, Image, X, Download, Save,
  CheckCircle, AlertCircle, Loader2, Eye, Edit3
} from 'lucide-react';

// ── Field definitions for the extraction form ─────────────────────────────────
const FIELDS = [
  { key: 'invoice_no',      label: 'Invoice Number',    type: 'text' },
  { key: 'invoice_date',    label: 'Invoice Date',       type: 'date' },
  { key: 'gstin_no',        label: 'GSTIN',              type: 'text',   placeholder: '22AAAAA0000A1Z5' },
  { key: 'vendor_name',     label: 'Vendor Name',        type: 'text' },
  { key: 'gst_rate',        label: 'GST Rate (%)',       type: 'number', step: '0.01' },
  { key: 'taxable_amount',  label: 'Taxable Amount (₹)', type: 'number', step: '0.01' },
];

// ── Extracted Field Input ─────────────────────────────────────────────────────
function ExtractionField({ field, value, onChange }) {
  return (
    <div>
      <label className="block text-navy-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
        {field.label}
      </label>
      <input
        type={field.type}
        step={field.step}
        value={value || ''}
        onChange={e => onChange(field.key, e.target.value)}
        placeholder={field.placeholder || `Enter ${field.label}`}
        className="w-full bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm
                   placeholder-navy-600 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400
                   transition-colors"
      />
    </div>
  );
}

export default function UploadAndExtract() {
  const [dragOver, setDragOver]   = useState(false);
  const [file, setFile]           = useState(null);
  const [fileURL, setFileURL]     = useState('');
  const [stage, setStage]         = useState('idle'); // idle | uploading | extracted | saving | saved
  const [progress, setProgress]   = useState(0);
  const [extracted, setExtracted] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const [error, setError]         = useState('');
  const inputRef = useRef();

  // ── File Selection ──────────────────────────────────────────────────────────
  const selectFile = useCallback((selectedFile) => {
    if (!selectedFile) return;
    const allowed = ['image/jpeg','image/png','image/webp','application/pdf'];
    if (!allowed.includes(selectedFile.type)) {
      setError('Only JPEG, PNG, WebP, and PDF files are supported.');
      return;
    }
    setFile(selectedFile);
    setFileURL(URL.createObjectURL(selectedFile));
    setError('');
    setStage('idle');
    setExtracted(null);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    selectFile(e.dataTransfer.files[0]);
  }, [selectFile]);

  // ── Submit to Gemini Extraction ─────────────────────────────────────────────
  const handleExtract = async () => {
    if (!file) return;
    setError('');
    setStage('uploading');
    setProgress(0);

    const formData = new FormData();
    formData.append('invoice', file);

    try {
      const res = await axios.post('/api/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      setExtracted(res.data.extracted);
      setInvoiceId(res.data.invoice.id);
      setStage('extracted');
    } catch (err) {
      setError(err.response?.data?.error || 'Extraction failed. Please try again.');
      setStage('idle');
    }
  };

  // ── Save Corrections ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!invoiceId || !extracted) return;
    setStage('saving');
    try {
      await axios.put(`/api/invoices/${invoiceId}`, extracted);
      setStage('saved');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed.');
      setStage('extracted');
    }
  };

  // ── Download JSON ────────────────────────────────────────────────────────────
  const handleDownloadJSON = () => {
    if (!extracted) return;
    const blob = new Blob([JSON.stringify(extracted, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `invoice_${extracted.invoice_no || invoiceId || 'extracted'}.json`;
    a.click();
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setFile(null);
    setFileURL('');
    setStage('idle');
    setExtracted(null);
    setProgress(0);
    setError('');
    setInvoiceId(null);
  };

  const isImage = file?.type?.startsWith('image/');

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* ── Stage: No file selected — show drop zone ─── */}
      {!file && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all
            ${dragOver
              ? 'border-brand-400 bg-brand-500/5'
              : 'border-white/10 hover:border-white/20 hover:bg-white/2'
            }
          `}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={e => selectFile(e.target.files[0])}
          />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-brand-400' : 'text-navy-600'}`} />
          <p className="text-white font-semibold text-lg mb-2">
            {dragOver ? 'Drop your invoice here' : 'Drag & drop your invoice'}
          </p>
          <p className="text-navy-500 text-sm mb-4">
            Supports JPEG, PNG, WebP, and PDF · Max 20 MB
          </p>
          <span className="bg-brand-500 text-white px-5 py-2 rounded-xl text-sm font-medium">
            Browse Files
          </span>
        </div>
      )}

      {/* ── Stage: File selected — show split-screen layout ─── */}
      {file && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: Document Viewer ── */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2 min-w-0">
                {isImage
                  ? <Image className="w-4 h-4 text-brand-400 flex-shrink-0" />
                  : <FileText className="w-4 h-4 text-brand-400 flex-shrink-0" />
                }
                <span className="text-white text-sm font-medium truncate">{file.name}</span>
              </div>
              <button onClick={handleReset} className="text-navy-500 hover:text-white transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Document Preview */}
            <div className="flex-1 min-h-[400px] bg-gray-950 flex items-center justify-center p-4">
              {isImage ? (
                <img
                  src={fileURL}
                  alt="Invoice preview"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : (
                <iframe
                  src={fileURL}
                  title="PDF viewer"
                  className="w-full h-full min-h-[400px] rounded-lg border-0"
                />
              )}
            </div>

            {/* Upload Progress */}
            {stage === 'uploading' && (
              <div className="px-4 py-3 border-t border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-navy-400 text-xs">Extracting with Gemini AI…</span>
                  <span className="text-brand-400 text-xs font-medium">{progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Extract Button */}
            {(stage === 'idle') && (
              <div className="px-4 py-3 border-t border-white/5">
                <button
                  onClick={handleExtract}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Extract with Gemini AI
                </button>
              </div>
            )}

            {stage === 'uploading' && (
              <div className="px-4 py-3 border-t border-white/5">
                <div className="w-full bg-gray-800 text-navy-400 font-medium py-2.5 rounded-xl flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing…
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: Extraction Form ── */}
          <div className="bg-gray-900 border border-white/5 rounded-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
              <Edit3 className="w-4 h-4 text-brand-400" />
              <h3 className="text-white font-semibold text-sm">Extracted Data</h3>
              {stage === 'extracted' && (
                <span className="ml-auto text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                  Ready to review
                </span>
              )}
              {stage === 'saved' && (
                <span className="ml-auto text-xs bg-brand-500/10 border border-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Saved
                </span>
              )}
            </div>

            {/* Form Fields */}
            <div className="flex-1 p-5 space-y-4 overflow-y-auto">
              {stage === 'idle' && (
                <div className="text-center py-12 text-navy-600 text-sm">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  Click "Extract with Gemini AI" to begin extraction
                </div>
              )}

              {stage === 'uploading' && (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 mx-auto mb-3 text-brand-400 animate-spin" />
                  <p className="text-white font-medium">Analyzing invoice…</p>
                  <p className="text-navy-500 text-sm mt-1">Gemini is reading your document</p>
                </div>
              )}

              {(stage === 'extracted' || stage === 'saving' || stage === 'saved') && extracted && (
                FIELDS.map(field => (
                  <ExtractionField
                    key={field.key}
                    field={field}
                    value={extracted[field.key]}
                    onChange={(key, val) => setExtracted(prev => ({ ...prev, [key]: val }))}
                  />
                ))
              )}
            </div>

            {/* Action Buttons */}
            {(stage === 'extracted' || stage === 'saving' || stage === 'saved') && (
              <div className="px-5 py-4 border-t border-white/5 flex gap-3">
                <button
                  onClick={handleDownloadJSON}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 border border-white/10 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
                <button
                  onClick={handleSave}
                  disabled={stage === 'saving' || stage === 'saved'}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {stage === 'saving'
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                    : stage === 'saved'
                    ? <><CheckCircle className="w-4 h-4" /> Saved</>
                    : <><Save className="w-4 h-4" /> Save Corrections</>
                  }
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
