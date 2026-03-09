import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Upload, X, Download, Trash2, Eye, Search,
  FileText, Image, Film, Music, Archive, File,
  ChevronDown, MoreVertical, Edit3,
  AlertTriangle, CheckCircle2, Loader2, Grid3X3, List,
  Paperclip, RefreshCw, Info, Copy,
  FileSpreadsheet, ZoomIn,
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ══════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════

export interface AttachmentItem {
  id: number;
  name: string;
  original_name: string;
  path: string;
  disk: string;
  mime_type: string;
  extension: string;
  size: number;
  description?: string;
  thumbnail_path?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  version: number;
  url: string;
  formatted_size: string;
  is_image: boolean;
  file_category: string;
  user?: { id: number; name: string; email: string };
  created_at: string;
  updated_at: string;
}

interface AttachmentStats {
  total: number;
  total_size: number;
  by_category: Record<string, number>;
  recent: AttachmentItem[];
}

export type AttachableType = 'task' | 'user_story' | 'project' | 'epic';

interface Props {
  attachableType: AttachableType;
  attachableId: number;
  readOnly?: boolean;
  compact?: boolean;
  showStats?: boolean;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════
// Constants  — Presentation & Code removed (not in lucide-react 0.263)
// ══════════════════════════════════════════════════════════════════════

const ACCEPTED_TYPES = [
  'image/*', 'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/json', 'application/zip',
  'video/mp4', 'video/webm',
  'audio/mpeg',
].join(',');

const CATEGORY_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
}> = {
  image:       { label: 'Image',       icon: Image,           color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  pdf:         { label: 'PDF',         icon: FileText,        color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200' },
  word:        { label: 'Word',        icon: FileText,        color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  excel:       { label: 'Excel',       icon: FileSpreadsheet, color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  powerpoint:  { label: 'PowerPoint',  icon: FileText,        color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  video:       { label: 'Video',       icon: Film,            color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  audio:       { label: 'Audio',       icon: Music,           color: 'text-pink-600',   bg: 'bg-pink-50',   border: 'border-pink-200' },
  archive:     { label: 'Archive',     icon: Archive,         color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  text:        { label: 'Text',        icon: FileText,        color: 'text-gray-600',   bg: 'bg-gray-50',   border: 'border-gray-200' },
  code:        { label: 'Code',        icon: FileText,        color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  other:       { label: 'File',        icon: File,            color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200' },
};

// ══════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return bytes + ' B';
  if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(2) + ' GB';
}

function timeAgo(d: string): string {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60)     return 'just now';
  if (s < 3600)   return `${Math.floor(s / 60)}m ago`;
  if (s < 86400)  return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function getFileCfg(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
}

function FileIcon({ category, className = 'w-5 h-5' }: { category: string; className?: string }) {
  const cfg = getFileCfg(category);
  return <cfg.icon className={`${className} ${cfg.color}`} />;
}

function isPreviewable(mime: string): boolean {
  return (
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    mime.startsWith('video/') ||
    mime.startsWith('text/')
  );
}

// ══════════════════════════════════════════════════════════════════════
// File Preview Modal
// ══════════════════════════════════════════════════════════════════════

function FilePreviewModal({ attachment, onClose }: {
  attachment: AttachmentItem;
  onClose: () => void;
}) {
  const cfg = getFileCfg(attachment.file_category);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
              <FileIcon category={attachment.file_category} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{attachment.original_name}</p>
              <p className="text-xs text-gray-400">{attachment.formatted_size} · {attachment.mime_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={attachment.url} download={attachment.original_name}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors">
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {attachment.mime_type.startsWith('image/') ? (
            <div className="flex items-center justify-center p-6 min-h-[300px]">
              <img src={attachment.url} alt={attachment.original_name}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-sm" />
            </div>
          ) : attachment.mime_type === 'application/pdf' ? (
            <iframe src={attachment.url + '#toolbar=1'} className="w-full h-[70vh]"
              title={attachment.original_name} />
          ) : attachment.mime_type.startsWith('video/') ? (
            <div className="flex items-center justify-center p-6">
              <video controls className="max-w-full rounded-xl" style={{ maxHeight: '70vh' }}>
                <source src={attachment.url} type={attachment.mime_type} />
              </video>
            </div>
          ) : attachment.mime_type.startsWith('audio/') ? (
            <div className="flex items-center justify-center p-12">
              <audio controls className="w-full max-w-lg">
                <source src={attachment.url} type={attachment.mime_type} />
              </audio>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${cfg.bg} border-2 ${cfg.border}`}>
                <FileIcon category={attachment.file_category} className="w-10 h-10" />
              </div>
              <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
              <a href={attachment.url} download={attachment.original_name}
                className="btn-primary flex items-center gap-2">
                <Download className="w-4 h-4" /> Download to view
              </a>
            </div>
          )}
        </div>

        {attachment.description && (
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
              {attachment.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Edit Attachment Modal
// ══════════════════════════════════════════════════════════════════════

function EditAttachmentModal({ attachment, onClose, onSaved }: {
  attachment: AttachmentItem;
  onClose: () => void;
  onSaved: (updated: AttachmentItem) => void;
}) {
  const [description, setDescription] = useState(attachment.description ?? '');
  const [name, setName]               = useState(attachment.original_name);
  const [saving, setSaving]           = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put(`/attachments/${attachment.id}`, {
        description:   description || null,
        original_name: name.trim() || attachment.original_name,
      });
      onSaved(res.data);
      toast.success('Updated!');
      onClose();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5 space-y-4"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Edit Attachment</h3>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">File Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="input" rows={3} placeholder="Add a description for this file…" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="btn-primary flex-1 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Attachment Card (Grid)
// ══════════════════════════════════════════════════════════════════════

function AttachmentCard({ attachment, selected, onSelect, onPreview, onDownload, onEdit, onDelete }: {
  attachment: AttachmentItem;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = getFileCfg(attachment.file_category);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(attachment.url);
    toast.success('URL copied!');
  };

  return (
    <div className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${
      selected ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-100'
    }`}>
      {/* Thumbnail */}
      <div className="relative h-36 cursor-pointer overflow-hidden bg-gray-50 flex items-center justify-center"
        onClick={onPreview}>

        {/* Checkbox */}
        <div className="absolute top-2.5 left-2.5 z-10">
          <input type="checkbox" checked={selected} onChange={onSelect}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 rounded accent-indigo-600 transition-opacity"
            style={{ opacity: selected ? 1 : undefined }}
          />
        </div>

        {/* Menu */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <button onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="p-1.5 rounded-lg bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 transition-all">
            <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10"
                onClick={e => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-36">
                {isPreviewable(attachment.mime_type) && (
                  <button onClick={e => { e.stopPropagation(); onPreview(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Eye className="w-3.5 h-3.5" /> Preview
                  </button>
                )}
                <button onClick={e => { e.stopPropagation(); onDownload(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={e => { e.stopPropagation(); handleCopyUrl(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Copy className="w-3.5 h-3.5" /> Copy URL
                </button>
                <button onClick={e => { e.stopPropagation(); onEdit(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <div className="border-t border-gray-100 my-0.5" />
                <button onClick={e => { e.stopPropagation(); onDelete(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        {attachment.is_image && attachment.url ? (
          <>
            <img src={attachment.thumbnail_url ?? attachment.url} alt={attachment.original_name}
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
            </div>
          </>
        ) : attachment.mime_type.startsWith('video/') ? (
          <div className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${cfg.bg}`}>
              <Film className={`w-7 h-7 ${cfg.color}`} />
            </div>
            <span className="text-xs text-gray-400 uppercase font-bold">{attachment.extension}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${cfg.bg} ${cfg.border}`}>
              <FileIcon category={attachment.file_category} className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">
              .{attachment.extension || attachment.mime_type.split('/')[1]}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5">
        <p className="text-xs font-bold text-gray-900 truncate" title={attachment.original_name}>
          {attachment.original_name}
        </p>
        {attachment.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{attachment.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{attachment.formatted_size}</span>
          <div className="flex items-center gap-1">
            {attachment.user && (
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold"
                title={attachment.user.name}>
                {attachment.user.name.charAt(0)}
              </div>
            )}
            <span className="text-xs text-gray-400">{timeAgo(attachment.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Attachment Row (List)
// ══════════════════════════════════════════════════════════════════════

function AttachmentRow({ attachment, selected, onSelect, onPreview, onDownload, onEdit, onDelete }: {
  attachment: AttachmentItem;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = getFileCfg(attachment.file_category);
  return (
    <tr className={`hover:bg-gray-50 transition-colors group border-b border-gray-50 last:border-0 ${selected ? 'bg-indigo-50' : ''}`}>
      <td className="px-3 py-3 w-10">
        <input type="checkbox" checked={selected} onChange={onSelect}
          className="w-4 h-4 rounded accent-indigo-600" />
      </td>
      <td className="px-3 py-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.bg} border ${cfg.border} flex-shrink-0`}>
          {attachment.is_image && attachment.url
            ? <img src={attachment.thumbnail_url ?? attachment.url} alt="" className="w-9 h-9 object-cover rounded-xl" />
            : <FileIcon category={attachment.file_category} />}
        </div>
      </td>
      <td className="px-3 py-3 max-w-xs">
        <button onClick={onPreview}
          className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors text-left truncate max-w-full block">
          {attachment.original_name}
        </button>
        {attachment.description && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{attachment.description}</p>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>
          {cfg.label}
        </span>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-500">{attachment.formatted_size}</td>
      <td className="px-3 py-3">
        {attachment.user
          ? <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[9px] font-bold">
                {attachment.user.name.charAt(0)}
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[80px]">{attachment.user.name}</span>
            </div>
          : <span className="text-xs text-gray-400">—</span>}
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-xs text-gray-400">{timeAgo(attachment.created_at)}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isPreviewable(attachment.mime_type) && (
            <button onClick={onPreview}
              className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 transition-colors" title="Preview">
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onDownload}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Download">
            <Download className="w-3.5 h-3.5" />
          </button>
          <button onClick={onEdit}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Edit">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Upload Drop Zone
// ══════════════════════════════════════════════════════════════════════

function UploadZone({ onFiles, disabled }: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files).filter(f => f.size > 0);
    if (files.length > 0) onFiles(files);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 select-none ${
        dragging  ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' :
        disabled  ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed' :
                    'border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40'
      }`}>
      <input ref={inputRef} type="file" multiple accept={ACCEPTED_TYPES}
        onChange={handleInput} className="hidden" disabled={disabled} />

      <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all ${
        dragging ? 'bg-indigo-500 scale-110' : 'bg-gray-100'
      }`}>
        <Upload className={`w-7 h-7 transition-colors ${dragging ? 'text-white' : 'text-gray-400'}`} />
      </div>

      {dragging ? (
        <p className="text-indigo-600 font-bold text-sm">Drop files here!</p>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Drop files here or <span className="text-indigo-600">click to browse</span>
          </p>
          <p className="text-xs text-gray-400">Images, PDFs, Word, Excel, PowerPoint, Videos, Archives and more</p>
          <p className="text-xs text-gray-400 mt-1">Max 10 files · 50MB each</p>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Upload Progress List
// ══════════════════════════════════════════════════════════════════════

function UploadProgress({ items, onRemove }: {
  items: UploadItem[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map(item => {
        const category = item.file.type.startsWith('image/') ? 'image'
          : item.file.type === 'application/pdf' ? 'pdf'
          : 'other';
        const cfg = getFileCfg(category);

        return (
          <div key={item.id}
            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
              item.status === 'error' ? 'bg-red-50 border-red-200' :
              item.status === 'done'  ? 'bg-green-50 border-green-200' :
              'bg-gray-50 border-gray-200'
            }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
              <FileIcon category={category} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-800 truncate">{item.file.name}</p>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">{formatBytes(item.file.size)}</span>
              </div>
              {item.status === 'uploading' && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${item.progress}%` }} />
                </div>
              )}
              {item.status === 'done' && (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Uploaded successfully
                </p>
              )}
              {item.status === 'error' && (
                <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {item.error ?? 'Upload failed'}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              {item.status === 'uploading' ? (
                <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
              ) : item.status === 'done' ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <button onClick={() => onRemove(item.id)}
                  className="p-1 rounded-lg hover:bg-red-100 text-red-400 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Main Component
// ══════════════════════════════════════════════════════════════════════

export default function TaskAttachments({
  attachableType,
  attachableId,
  readOnly = false,
  compact = false,
  showStats: showStatsProp = false,
}: Props) {

  // ── state ──
  const [attachments,       setAttachments      ] = useState<AttachmentItem[]>([]);
  const [loading,           setLoading          ] = useState(true);
  const [stats,             setStats            ] = useState<AttachmentStats | null>(null);
  const [uploadItems,       setUploadItems      ] = useState<UploadItem[]>([]);
  const [uploading,         setUploading        ] = useState(false);
  const [selectedIds,       setSelectedIds      ] = useState<number[]>([]);
  const [viewMode,          setViewMode         ] = useState<'grid' | 'list'>('grid');
  const [search,            setSearch           ] = useState('');
  const [filterCategory,    setFilterCategory   ] = useState('');
  const [sortBy,            setSortBy           ] = useState<'created_at' | 'name' | 'size'>('created_at');
  const [sortDir,           setSortDir          ] = useState<'asc' | 'desc'>('desc');
  const [previewItem,       setPreviewItem      ] = useState<AttachmentItem | null>(null);
  const [editItem,          setEditItem         ] = useState<AttachmentItem | null>(null);
  const [deleteTarget,      setDeleteTarget     ] = useState<AttachmentItem | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [showUpload,        setShowUpload       ] = useState(false);

  const paramKey = attachableType === 'task'       ? 'task_id'
                 : attachableType === 'user_story' ? 'story_id'
                 : attachableType === 'project'    ? 'project_id'
                 : 'epic_id';

  // ── fetch ──
  const fetchAttachments = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { [paramKey]: attachableId };
      if (filterCategory) params.category = filterCategory;
      if (search)         params.search   = search;
      const res = await api.get('/attachments', { params });
      setAttachments(res.data);
    } catch {
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [attachableId, filterCategory, search, paramKey]);

  const fetchStats = useCallback(async () => {
    if (!showStatsProp) return;
    try {
      const res = await api.get('/attachments/stats', { params: { [paramKey]: attachableId } });
      setStats(res.data);
    } catch {}
  }, [attachableId, paramKey, showStatsProp]);

  useEffect(() => { fetchAttachments(); fetchStats(); }, [fetchAttachments, fetchStats]);

  // ── upload ──
  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    const items: UploadItem[] = files.map(f => ({
      id: crypto.randomUUID(), file: f, progress: 0, status: 'pending',
    }));
    setUploadItems(items);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('attachable_type', attachableType);
      formData.append('attachable_id',   String(attachableId));
      files.forEach(f => formData.append('files[]', f));
      setUploadItems(prev => prev.map(i => ({ ...i, status: 'uploading', progress: 10 })));
      const res = await api.post('/attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: e => {
          const pct = Math.round((e.loaded / (e.total ?? 1)) * 90) + 10;
          setUploadItems(prev => prev.map(i => ({ ...i, status: 'uploading', progress: Math.min(95, pct) })));
        },
      });
      const { uploaded, errors } = res.data;
      setUploadItems(prev => prev.map(item => {
        const hasError = errors?.some((e: string) => e.includes(item.file.name));
        return {
          ...item, status: hasError ? 'error' : 'done', progress: 100,
          error: hasError ? errors.find((e: string) => e.includes(item.file.name))?.split(': ')[1] : undefined,
        };
      }));
      if (uploaded?.length > 0) {
        setAttachments(prev => [...uploaded, ...prev]);
        toast.success(`${uploaded.length} file${uploaded.length > 1 ? 's' : ''} uploaded!`);
      }
      if (errors?.length > 0) errors.forEach((e: string) => toast.error(e));
      fetchStats();
      setTimeout(() => setUploadItems([]), 3000);
    } catch {
      setUploadItems(prev => prev.map(i => ({ ...i, status: 'error', error: 'Upload failed' })));
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── delete ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/attachments/${deleteTarget.id}`);
      setAttachments(prev => prev.filter(a => a.id !== deleteTarget.id));
      toast.success('Deleted!');
      setDeleteTarget(null);
      fetchStats();
    } catch { toast.error('Failed to delete'); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    try {
      await api.delete('/attachments/bulk', { data: { ids: selectedIds } });
      setAttachments(prev => prev.filter(a => !selectedIds.includes(a.id)));
      toast.success(`${selectedIds.length} files deleted`);
      setSelectedIds([]);
      setConfirmBulkDelete(false);
      fetchStats();
    } catch { toast.error('Failed to delete'); }
  };

  // ── download ──
  const handleDownload = (att: AttachmentItem) => {
    const a = document.createElement('a');
    a.href = `/api/attachments/${att.id}/download`;
    a.download = att.original_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleBulkDownload = () => {
    attachments.filter(a => selectedIds.includes(a.id)).forEach((att, i) =>
      setTimeout(() => handleDownload(att), i * 300)
    );
  };

  // ── sort / filter ──
  const sorted = [...attachments]
    .filter(a => {
      if (search && !a.original_name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && a.file_category !== filterCategory) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.original_name.localeCompare(b.original_name);
      else if (sortBy === 'size') cmp = a.size - b.size;
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const toggleSelect = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const selectAll  = () => setSelectedIds(sorted.map(a => a.id));
  const clearSel   = () => setSelectedIds([]);
  const totalSize  = attachments.reduce((s, a) => s + a.size, 0);
  const categories = [...new Set(attachments.map(a => a.file_category))];

  // ══════════════════════════════════════════════════════════════════
  // Compact mode
  // ══════════════════════════════════════════════════════════════════

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
            Attachments ({attachments.length})
          </span>
          {!readOnly && (
            <label className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" /> Add
              <input type="file" multiple accept={ACCEPTED_TYPES}
                onChange={e => handleFiles(Array.from(e.target.files ?? []))} className="hidden" />
            </label>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        ) : attachments.length === 0 ? (
          <p className="text-xs text-gray-400 py-3 text-center">No attachments</p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {attachments.map(att => {
              const cfg = getFileCfg(att.file_category);
              return (
                <div key={att.id}
                  className="flex items-center gap-2.5 p-2 bg-gray-50 rounded-xl border border-gray-100 hover:border-indigo-200 group transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                    {att.is_image && att.url
                      ? <img src={att.url} alt="" className="w-7 h-7 object-cover rounded-lg" />
                      : <FileIcon category={att.file_category} className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-700 truncate">{att.original_name}</p>
                    <p className="text-[10px] text-gray-400">{att.formatted_size}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPreviewable(att.mime_type) && (
                      <button onClick={() => setPreviewItem(att)}
                        className="p-1 rounded-lg hover:bg-indigo-50 text-indigo-400 transition-colors">
                        <Eye className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => handleDownload(att)}
                      className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 transition-colors">
                      <Download className="w-3 h-3" />
                    </button>
                    {!readOnly && (
                      <button onClick={() => setDeleteTarget(att)}
                        className="p-1 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {previewItem && <FilePreviewModal attachment={previewItem} onClose={() => setPreviewItem(null)} />}

        {deleteTarget && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
              <p className="text-sm font-semibold text-gray-900">Delete attachment?</p>
              <p className="text-sm text-gray-500">{deleteTarget.original_name}</p>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="btn-danger flex-1 text-sm">Delete</button>
                <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // Full mode
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">

      {/* Stats bar */}
      {showStatsProp && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Files', value: stats.total,                                                     color: 'text-gray-700'   },
            { label: 'Images',      value: stats.by_category?.image ?? 0,                                   color: 'text-blue-600'   },
            { label: 'Documents',   value: (stats.by_category?.pdf ?? 0) + (stats.by_category?.word ?? 0), color: 'text-red-600'    },
            { label: 'Videos',      value: stats.by_category?.video ?? 0,                                   color: 'text-purple-600' },
            { label: 'Total Size',  value: formatBytes(stats.total_size),                                   color: 'text-gray-600'   },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 text-center">
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload section */}
      {!readOnly && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <button onClick={() => setShowUpload(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Upload className="w-4 h-4 text-indigo-600" />
              </div>
              <span className="text-sm font-bold text-gray-800">Upload Files</span>
              {uploading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showUpload ? 'rotate-180' : ''}`} />
          </button>
          {showUpload && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
              <UploadZone onFiles={handleFiles} disabled={uploading} />
              <UploadProgress items={uploadItems}
                onRemove={id => setUploadItems(p => p.filter(i => i.id !== id))} />
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search files…" value={search}
              onChange={e => setSearch(e.target.value)} className="input pl-9 w-full" />
          </div>

          {categories.length > 1 && (
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input w-36">
              <option value="">All Types</option>
              {categories.map(c => (
                <option key={c} value={c}>{CATEGORY_CONFIG[c]?.label ?? c}</option>
              ))}
            </select>
          )}

          <select value={`${sortBy}:${sortDir}`}
            onChange={e => {
              const [by, dir] = e.target.value.split(':');
              setSortBy(by as typeof sortBy);
              setSortDir(dir as typeof sortDir);
            }}
            className="input w-36">
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="name:asc">Name A–Z</option>
            <option value="name:desc">Name Z–A</option>
            <option value="size:desc">Largest first</option>
            <option value="size:asc">Smallest first</option>
          </select>

          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 ml-auto">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-400 hover:text-gray-600'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>

          <button onClick={fetchAttachments}
            className="p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Count + bulk actions */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {sorted.length} file{sorted.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
            </span>
            {sorted.length > 0 && (
              <button onClick={selectedIds.length === sorted.length ? clearSel : selectAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
                {selectedIds.length === sorted.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-600 font-bold">{selectedIds.length} selected</span>
              <button onClick={handleBulkDownload}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" /> Download
              </button>
              {!readOnly && (
                <button onClick={() => setConfirmBulkDelete(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-semibold transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              <button onClick={clearSel}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* File grid / list / empty */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Paperclip className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-bold text-lg">No attachments</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || filterCategory ? 'No files match your filters' : 'Upload files to get started'}
          </p>
          {!readOnly && !search && !filterCategory && (
            <button onClick={() => setShowUpload(true)}
              className="btn-primary mt-4 flex items-center gap-2 mx-auto">
              <Upload className="w-4 h-4" /> Upload Files
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {sorted.map(att => (
            <AttachmentCard key={att.id} attachment={att}
              selected={selectedIds.includes(att.id)}
              onSelect={() => toggleSelect(att.id)}
              onPreview={() => setPreviewItem(att)}
              onDownload={() => handleDownload(att)}
              onEdit={() => setEditItem(att)}
              onDelete={() => setDeleteTarget(att)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input type="checkbox"
                    checked={selectedIds.length === sorted.length && sorted.length > 0}
                    onChange={selectedIds.length === sorted.length ? clearSel : selectAll}
                    className="w-4 h-4 rounded accent-indigo-600" />
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-12">Preview</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Size</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Uploaded By</th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map(att => (
                <AttachmentRow key={att.id} attachment={att}
                  selected={selectedIds.includes(att.id)}
                  onSelect={() => toggleSelect(att.id)}
                  onPreview={() => setPreviewItem(att)}
                  onDownload={() => handleDownload(att)}
                  onEdit={() => setEditItem(att)}
                  onDelete={() => setDeleteTarget(att)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modals ── */}

      {previewItem && (
        <FilePreviewModal attachment={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {editItem && (
        <EditAttachmentModal attachment={editItem} onClose={() => setEditItem(null)}
          onSaved={updated => {
            setAttachments(prev => prev.map(a => a.id === updated.id ? updated : a));
            setEditItem(null);
          }} />
      )}

      {/* Delete single */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">Delete attachment?</p>
                <p className="text-sm text-red-600 mt-1 break-all">{deleteTarget.original_name}</p>
                <p className="text-xs text-red-500 mt-1">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="btn-danger flex-1">Yes, Delete</button>
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700">Delete {selectedIds.length} files?</p>
                <p className="text-xs text-red-500 mt-1">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={handleBulkDelete} className="btn-danger flex-1">Delete All</button>
              <button onClick={() => setConfirmBulkDelete(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}