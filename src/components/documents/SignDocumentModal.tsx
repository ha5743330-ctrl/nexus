import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { SignaturePad, SignaturePadHandle } from './SignaturePad';
import { Document } from '../../types';
import { signDocument } from '../../services/documentService';

interface SignDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onSigned: (updated: Document) => void;
}

export const SignDocumentModal: React.FC<SignDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  onSigned,
}) => {
  const padRef = useRef<SignaturePadHandle>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSign = async () => {
    if (!document) return;
    if (!padRef.current || padRef.current.isEmpty()) {
      toast.error('Please draw your signature first.');
      return;
    }

    setIsSubmitting(true);
    try {
      const blob = await padRef.current.toBlob();
      if (!blob) {
        toast.error('Could not capture your signature. Please try again.');
        return;
      }
      const updated = await signDocument(document.id, blob);
      toast.success('Document signed.');
      onSigned(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not sign the document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document ? `Sign "${document.name}"` : 'Sign document'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={() => padRef.current?.clear()}>
            Clear
          </Button>
          <Button onClick={handleSign} isLoading={isSubmitting}>
            Sign document
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">
        By signing, you confirm you've reviewed this document and agree to its contents.
      </p>
      <SignaturePad ref={padRef} />
    </Modal>
  );
};
