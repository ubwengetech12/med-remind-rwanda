'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { Plus, FileText, Image, Upload, X, Download, Eye, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import type { MedicalRecord, RecordType } from '@/types';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

const RECORD_TYPES: { value: RecordType; label: string; icon: string }[] = [
  { value: 'prescription', label: 'Prescription', icon: '📋' },
  { value: 'lab_result', label: 'Lab Result', icon: '🧪' },
  { value: 'scan', label: 'Scan/X-Ray', icon: '🔬' },
  { value: 'report', label: 'Medical Report', icon: '📄' },
  { value: 'other', label: 'Other', icon: '📁' },
];

export default function RecordsPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [activeFilter, setActiveFilter] = useState<RecordType | 'all'>('all');
  const [uploadForm, setUploadForm] = useState({
    title: '',
    record_type: 'prescription' as RecordType,
    doctor_name: '',
    record_date: '',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchRecords();
  }, [user]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', user!.id)
      .order('uploaded_at', { ascending: false });
    if (!error) setRecords(data || []);
    setLoading(false);
  };

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file || !uploadForm.title || !user) {
      toast.error('Please fill in required fields and select a file');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('medical-records')
        .upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('medical-records')
        .getPublicUrl(path);

      const fileType = file.type.startsWith('image/') ? 'image' : file.type === 'application/pdf' ? 'pdf' : 'other';
      const { error: dbErr } = await supabase.from('medical_records').insert({
        user_id: user.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: fileType,
        ...uploadForm,
      });
      if (dbErr) throw dbErr;

      toast.success('Record uploaded!');
      setShowUpload(false);
      setFile(null);
      setPreviewUrl(null);
      setUploadForm({ title: '', record_type: 'prescription', doctor_name: '', record_date: '', description: '' });
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filtered = activeFilter === 'all' ? records : records.filter((r) => r.record_type === activeFilter);

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="bg-card px-5 pt-14 pb-4 sticky top-0 z-10 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-2xl font-display font-bold">Medical Records</h1>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-primary-500 text-white rounded-2xl px-4 py-2 flex items-center gap-2 text-sm font-semibold shadow-glow"
          >
            <Upload size={18} /> Upload
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <FilterChip label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
          {RECORD_TYPES.map((rt) => (
            <FilterChip key={rt.value} label={rt.label} active={activeFilter === rt.value} onClick={() => setActiveFilter(rt.value)} />
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-card h-20 rounded-3xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen size={48} className="text-muted mx-auto mb-4" />
            <p className="text-white font-semibold text-lg mb-1">No records yet</p>
            <p className="text-muted text-sm">Upload prescriptions, lab results & more</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((rec, i) => (
              <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card rounded-3xl p-4 border border-border flex items-center gap-4">
                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0',
                  rec.file_type === 'image' ? 'bg-blue-900/40' : 'bg-red-900/40')}>
                  {rec.file_type === 'image' ? '🖼️' : '📄'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{rec.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-muted text-xs">{RECORD_TYPES.find(r => r.value === rec.record_type)?.label}</span>
                    {rec.record_date && <span className="text-muted text-xs">· {format(new Date(rec.record_date), 'MMM d, yyyy')}</span>}
                    {rec.doctor_name && <span className="text-muted text-xs">· {rec.doctor_name}</span>}
                  </div>
                </div>
                <a href={rec.file_url} target="_blank" rel="noopener noreferrer"
                  className="bg-surface rounded-xl p-2.5 text-primary-400 hover:bg-primary-900/30 transition-colors">
                  <Eye size={16} />
                </a>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showUpload && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-end">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30 }}
              className="w-full bg-card rounded-t-3xl p-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white text-xl font-display font-bold">Upload Record</h2>
                <button onClick={() => setShowUpload(false)} className="text-muted hover:text-white"><X size={24} /></button>
              </div>

              <div {...getRootProps()} className={cn(
                'border-2 border-dashed rounded-3xl p-8 text-center transition-colors mb-5',
                isDragActive ? 'border-primary-400 bg-primary-900/20' : 'border-border hover:border-primary-600'
              )}>
                <input {...getInputProps()} />
                {previewUrl ? (
                  <img src={previewUrl} alt="preview" className="max-h-32 mx-auto rounded-2xl object-cover" />
                ) : file ? (
                  <div>
                    <FileText size={40} className="text-primary-400 mx-auto mb-2" />
                    <p className="text-white text-sm font-medium">{file.name}</p>
                    <p className="text-muted text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={36} className="text-muted mx-auto mb-3" />
                    <p className="text-white font-medium">Drop file here or tap to browse</p>
                    <p className="text-muted text-sm mt-1">Images & PDFs up to 10MB</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <FormField label="Title *">
                  <input value={uploadForm.title} onChange={e => setUploadForm(f => ({...f, title: e.target.value}))}
                    placeholder="e.g. Blood test results" className="input-style" />
                </FormField>
                <FormField label="Record Type">
                  <select value={uploadForm.record_type}
                    onChange={e => setUploadForm(f => ({...f, record_type: e.target.value as RecordType}))}
                    className="input-style">
                    {RECORD_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                  </select>
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Doctor Name">
                    <input value={uploadForm.doctor_name} onChange={e => setUploadForm(f => ({...f, doctor_name: e.target.value}))}
                      placeholder="Dr. Smith" className="input-style" />
                  </FormField>
                  <FormField label="Date">
                    <input type="date" value={uploadForm.record_date} onChange={e => setUploadForm(f => ({...f, record_date: e.target.value}))}
                      className="input-style" />
                  </FormField>
                </div>
                <FormField label="Notes">
                  <textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({...f, description: e.target.value}))}
                    rows={2} placeholder="Optional notes..." className="input-style resize-none" />
                </FormField>
              </div>

              <button onClick={handleUpload} disabled={uploading || !file}
                className="w-full mt-6 bg-primary-500 disabled:opacity-50 text-white h-14 rounded-2xl font-semibold text-lg shadow-glow flex items-center justify-center gap-2">
                {uploading ? 'Uploading...' : <><Upload size={18} /> Upload Record</>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn('flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors',
        active ? 'bg-primary-500 text-white' : 'bg-card text-muted hover:text-white border border-border')}>
      {label}
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-muted text-sm mb-1.5">{label}</label>
      {children}
    </div>
  );
}
