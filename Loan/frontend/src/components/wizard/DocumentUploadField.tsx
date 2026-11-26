import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { UploadedDoc } from '../../types';

interface Props {
  label: string;
  required?: boolean;
  document: UploadedDoc | null | undefined;
  error?: string;
  onUpload: (doc: UploadedDoc) => void;
  onRemove: () => void;
}

export const DocumentUploadField: React.FC<Props> = ({
  label,
  required = false,
  document,
  error,
  onUpload,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleFile = (file: File) => {
    setUploadError(null);

    // Max 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit');
      return;
    }

    // Validate type: images, PDF, docx/doc
    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.docx', '.doc'];
    const lowerName = file.name.toLowerCase();
    const isExtensionValid = validExtensions.some((ext) => lowerName.endsWith(ext));
    const isMimeValid =
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      file.type === 'application/msword' ||
      file.type ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isExtensionValid && !isMimeValid) {
      setUploadError('Only Image (JPG, PNG), PDF, or DOCX files allowed');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpload({
          fileName: file.name,
          fileSize: formatFileSize(file.size),
          fileType: file.type || 'application/octet-stream',
          dataUrl: reader.result,
        });
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const displayError = uploadError || error;

  const isImage =
    document?.fileType?.startsWith('image/') ||
    document?.fileName?.match(/\.(png|jpe?g|webp)$/i);

  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
        <span className="text-[11px] text-slate-400">PDF, DOCX, Image (Max 5MB)</span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.docx,.doc"
        multiple={false}
        onChange={handleChange}
        className="hidden"
      />

      {document ? (
        /* Uploaded State Card */
        <div className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 transition">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              {isImage ? (
                <ImageIcon className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate" title={document.fileName}>
                {document.fileName}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>{document.fileSize}</span>
                <span>&bull;</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) fileInputRef.current.value = '';
              onRemove();
            }}
            className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
            title="Remove document"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Empty / Upload Target */
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`flex items-center justify-center gap-2 sm:gap-3 p-3 rounded-lg border border-dashed cursor-pointer transition text-center sm:text-left ${
            dragActive
              ? 'border-bajaj-blue bg-blue-50/50'
              : displayError
              ? 'border-red-400 bg-red-50/20 hover:bg-red-50/40'
              : 'border-slate-300 hover:border-bajaj-blue hover:bg-slate-50/70 bg-white'
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <UploadCloud className="w-4 h-4 text-bajaj-blue" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700">
              <span className="text-bajaj-blue font-semibold hover:underline">Choose file</span> or drag & drop
            </p>
            <p className="text-[11px] text-slate-400">Single document upload</p>
          </div>
        </div>
      )}

      {displayError && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
};
