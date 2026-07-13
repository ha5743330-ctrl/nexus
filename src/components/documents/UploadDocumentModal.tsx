import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Document } from '../../types';
import { uploadDocument } from '../../services/documentService';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (doc: Document) => void;
}

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
};

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  onUploaded,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) {
      toast.error('That file type or size is not supported (max 15MB).');
      return;
    }
    const picked = accepted[0];
    if (picked) {
      setFile(picked);
      setName(picked.name);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 15 * 1024 * 1024,
    multiple: false,
  });

  const reset = () => {
    setFile(null);
    setName('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Choose a file to upload.');
      return;
    }

    setIsSubmitting(true);
    try {
      const doc = await uploadDocument(file, { name: name.trim() || file.name });
      toast.success('Document uploaded.');
      onUploaded(doc);
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not upload the document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload document"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleUpload} isLoading={isSubmitting}>
            Upload
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <UploadCloud size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              {isDragActive ? 'Drop the file here' : 'Drag & drop a file here, or click to browse'}
            </p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, XLSX, PNG, JPG — up to 15MB</p>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-3">
            <div className="flex items-center min-w-0">
              <FileIcon size={20} className="text-primary-600 mr-2 flex-shrink-0" />
              <span className="text-sm text-gray-900 truncate">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={reset}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0"
              aria-label="Remove file"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {file && (
          <Input
            label="Display name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
        )}
      </div>
    </Modal>
  );
};
