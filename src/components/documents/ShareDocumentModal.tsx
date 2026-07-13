import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { User, Document } from '../../types';
import { listUsersByRole } from '../../services/userService';
import { shareDocument } from '../../services/documentService';

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
  onShared: (updated: Document) => void;
}

export const ShareDocumentModal: React.FC<ShareDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  onShared,
}) => {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [selected, setSelected] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSearch('');
    setResults([]);
    setSelected([]);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !search.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const [entrepreneurs, investors] = await Promise.all([
          listUsersByRole('entrepreneur', { search: search.trim(), limit: 5 }),
          listUsersByRole('investor', { search: search.trim(), limit: 5 }),
        ]);
        const selectedIds = new Set(selected.map((u) => u.id));
        const merged = [...entrepreneurs.users, ...investors.users].filter(
          (u) => u.id !== currentUser?.id && !selectedIds.has(u.id)
        );
        setResults(merged);
      } catch {
        // silent - search failures shouldn't be intrusive
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [search, isOpen, currentUser, selected]);

  const handleShare = async () => {
    if (!document) return;
    if (selected.length === 0) {
      toast.error('Choose at least one person to share with.');
      return;
    }

    setIsSubmitting(true);
    try {
      const updated = await shareDocument(
        document.id,
        selected.map((u) => u.id)
      );
      toast.success('Document shared.');
      onShared(updated);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not share the document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document ? `Share "${document.name}"` : 'Share document'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleShare} isLoading={isSubmitting}>
            Share
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.map((u) => (
              <span
                key={u.id}
                className="flex items-center bg-primary-50 text-primary-700 text-sm rounded-full pl-1 pr-2 py-1"
              >
                <Avatar src={u.avatarUrl} alt={u.name} size="xs" className="mr-1" />
                {u.name}
                <button
                  type="button"
                  onClick={() => setSelected((prev) => prev.filter((s) => s.id !== u.id))}
                  className="ml-1 text-primary-500 hover:text-primary-700"
                  aria-label={`Remove ${u.name}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <Input
          type="text"
          placeholder="Search people by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startAdornment={<Search size={16} />}
          fullWidth
        />

        {isSearching && <p className="text-xs text-gray-500">Searching...</p>}

        {results.length > 0 && (
          <div className="border border-gray-200 rounded-md divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {results.map((u) => (
              <button
                type="button"
                key={u.id}
                onClick={() => {
                  setSelected((prev) => [...prev, u]);
                  setSearch('');
                  setResults([]);
                }}
                className="w-full flex items-center px-3 py-2 hover:bg-gray-50 text-left"
              >
                <Avatar src={u.avatarUrl} alt={u.name} size="xs" className="mr-2" />
                <div>
                  <span className="text-sm text-gray-900 block">{u.name}</span>
                  <span className="text-xs text-gray-500 capitalize">{u.role}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
