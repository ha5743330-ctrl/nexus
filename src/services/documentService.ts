import api, { API_URL } from './api';
import { Document, DocumentStatus } from '../types';

// Files are served from the server root (e.g. /uploads/...), not under /api
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');

interface BackendOwnerRef {
  _id: string;
  name?: string;
  avatarUrl?: string;
}

interface BackendSignature {
  signedBy: string | { _id: string; name?: string };
  signatureImageUrl: string;
  signedAt: string;
}

interface BackendDocument {
  _id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  owner: BackendOwnerRef;
  sharedWith: string[];
  version: number;
  status: DocumentStatus;
  signatures: BackendSignature[];
  createdAt: string;
  updatedAt: string;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
};

const friendlyType = (mimeType: string): string => {
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.includes('wordprocessingml') || mimeType === 'application/msword') return 'Document';
  if (mimeType.includes('spreadsheetml')) return 'Spreadsheet';
  return mimeType;
};

const toFrontendDocument = (doc: BackendDocument): Document => ({
  id: doc._id,
  name: doc.name,
  type: friendlyType(doc.type),
  size: formatSize(doc.size),
  lastModified: doc.updatedAt,
  shared: doc.sharedWith.length > 0,
  url: doc.url,
  ownerId: doc.owner._id,
  ownerName: doc.owner.name || 'Unknown',
  status: doc.status,
  sharedWith: doc.sharedWith,
  signatures: doc.signatures.map((s) => ({
    signedByName: typeof s.signedBy === 'string' ? s.signedBy : s.signedBy.name || 'Unknown',
    signedAt: s.signedAt,
  })),
});

export const fileUrl = (path: string): string => `${SERVER_URL}${path}`;

export const listMyDocuments = async (): Promise<Document[]> => {
  const { data } = await api.get('/documents');
  return (data.documents as BackendDocument[]).map(toFrontendDocument);
};

export const uploadDocument = async (
  file: File,
  options?: { name?: string; sharedWith?: string[] }
): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.name) formData.append('name', options.name);
  if (options?.sharedWith?.length) formData.append('sharedWith', JSON.stringify(options.sharedWith));

  const { data } = await api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return toFrontendDocument(data.document);
};

export const shareDocument = async (documentId: string, userIds: string[]): Promise<Document> => {
  const { data } = await api.post(`/documents/${documentId}/share`, { userIds });
  return toFrontendDocument(data.document);
};

export const signDocument = async (documentId: string, signatureBlob: Blob): Promise<Document> => {
  const formData = new FormData();
  formData.append('signature', signatureBlob, 'signature.png');

  const { data } = await api.post(`/documents/${documentId}/sign`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return toFrontendDocument(data.document);
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  await api.delete(`/documents/${documentId}`);
};
