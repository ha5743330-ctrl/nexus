import React, { useEffect, useMemo, useState } from 'react';
import { FileText, Upload, Download, Trash2, Share2, PenLine, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { UploadDocumentModal } from '../../components/documents/UploadDocumentModal';
import { ShareDocumentModal } from '../../components/documents/ShareDocumentModal';
import { SignDocumentModal } from '../../components/documents/SignDocumentModal';
import { useAuth } from '../../context/AuthContext';
import { Document, DocumentStatus } from '../../types';
import { listMyDocuments, deleteDocument, fileUrl } from '../../services/documentService';

const statusVariant: Record<DocumentStatus, BadgeVariant> = {
  draft: 'gray',
  pending_signature: 'warning',
  signed: 'success',
  archived: 'gray',
};

const statusLabel: Record<DocumentStatus, string> = {
  draft: 'Draft',
  pending_signature: 'Awaiting signature',
  signed: 'Signed',
  archived: 'Archived',
};

export const DocumentsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<Document | null>(null);
  const [signTarget, setSignTarget] = useState<Document | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    try {
      setDocuments(await listMyDocuments());
    } catch {
      toast.error('Could not load your documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const { myDocuments, sharedWithMe } = useMemo(() => {
    const mine: Document[] = [];
    const shared: Document[] = [];
    documents.forEach((d) => (d.ownerId === currentUser?.id ? mine.push(d) : shared.push(d)));
    return { myDocuments: mine, sharedWithMe: shared };
  }, [documents, currentUser]);

  const handleDelete = async (doc: Document) => {
    setBusyId(doc.id);
    try {
      await deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      toast.success('Document deleted.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Only the owner can delete this document.');
    } finally {
      setBusyId(null);
    }
  };

  const updateInList = (updated: Document) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const renderDocumentRow = (doc: Document, isOwner: boolean) => (
    <div
      key={doc.id}
      className="flex flex-col sm:flex-row sm:items-center p-4 hover:bg-gray-50 rounded-lg transition-colors duration-200 gap-3"
    >
      <div className="flex items-center flex-1 min-w-0">
        <div className="p-2 bg-primary-50 rounded-lg mr-4 flex-shrink-0">
          <FileText size={24} className="text-primary-600" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
            <Badge variant={statusVariant[doc.status]} size="sm">
              {statusLabel[doc.status]}
            </Badge>
            {doc.shared && (
              <Badge variant="secondary" size="sm">
                Shared
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 flex-wrap">
            <span>{doc.type}</span>
            <span>{doc.size}</span>
            <span>Modified {format(new Date(doc.lastModified), 'MMM d, yyyy')}</span>
            {!isOwner && <span>Shared by {doc.ownerName}</span>}
          </div>

          {doc.signatures.length > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              Signed by {doc.signatures.map((s) => s.signedByName).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <a href={fileUrl(doc.url)} target="_blank" rel="noopener noreferrer" download>
          <Button variant="ghost" size="sm" className="p-2" aria-label="Download">
            <Download size={18} />
          </Button>
        </a>

        {doc.status !== 'signed' && (
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            aria-label="Sign"
            onClick={() => setSignTarget(doc)}
          >
            <PenLine size={18} />
          </Button>
        )}

        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            aria-label="Share"
            onClick={() => setShareTarget(doc)}
          >
            <Share2 size={18} />
          </Button>
        )}

        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            className="p-2 text-error-600 hover:text-error-700"
            aria-label="Delete"
            isLoading={busyId === doc.id}
            onClick={() => handleDelete(doc)}
          >
            <Trash2 size={18} />
          </Button>
        )}
      </div>
    </div>
  );

  if (!currentUser) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-600">Upload, share, and e-sign your important files</p>
        </div>

        <Button leftIcon={<Upload size={18} />} onClick={() => setIsUploadOpen(true)}>
          Upload Document
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">My Documents</h2>
              <span className="text-sm text-gray-500">{myDocuments.length} file(s)</span>
            </CardHeader>
            <CardBody>
              {myDocuments.length > 0 ? (
                <div className="space-y-1 divide-y divide-gray-100">
                  {myDocuments.map((doc) => renderDocumentRow(doc, true))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 text-sm">No documents yet — upload your first file</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center gap-2">
              <Users size={18} className="text-gray-500" />
              <h2 className="text-lg font-medium text-gray-900">Shared with Me</h2>
              <span className="text-sm text-gray-500 ml-auto">{sharedWithMe.length} file(s)</span>
            </CardHeader>
            <CardBody>
              {sharedWithMe.length > 0 ? (
                <div className="space-y-1 divide-y divide-gray-100">
                  {sharedWithMe.map((doc) => renderDocumentRow(doc, false))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">Nothing has been shared with you yet</p>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploaded={(doc) => setDocuments((prev) => [doc, ...prev])}
      />

      <ShareDocumentModal
        isOpen={!!shareTarget}
        onClose={() => setShareTarget(null)}
        document={shareTarget}
        onShared={updateInList}
      />

      <SignDocumentModal
        isOpen={!!signTarget}
        onClose={() => setSignTarget(null)}
        document={signTarget}
        onSigned={updateInList}
      />
    </div>
  );
};
