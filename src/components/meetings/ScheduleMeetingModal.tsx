import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { User } from '../../types';
import { listUsersByRole } from '../../services/userService';
import { createMeeting } from '../../services/meetingService';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduled: () => void;
  /** Pre-select a participant, e.g. when scheduling from a profile page */
  presetParticipant?: User;
}

const toLocalInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  onScheduled,
  presetParticipant,
}) => {
  const { user: currentUser } = useAuth();
  const oppositeRole = currentUser?.role === 'entrepreneur' ? 'investor' : 'entrepreneur';

  const [participant, setParticipant] = useState<User | null>(presetParticipant || null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form each time the modal is opened
  useEffect(() => {
    if (!isOpen) return;
    setParticipant(presetParticipant || null);
    setSearch('');
    setResults([]);
    setTitle('');
    setDescription('');

    const defaultStart = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    defaultStart.setMinutes(0, 0, 0);
    const defaultEnd = new Date(defaultStart.getTime() + 30 * 60 * 1000); // +30 min
    setStartTime(toLocalInputValue(defaultStart));
    setEndTime(toLocalInputValue(defaultEnd));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Debounced participant search
  useEffect(() => {
    if (!isOpen || participant) return;
    if (!search.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const { users } = await listUsersByRole(oppositeRole, { search: search.trim(), limit: 6 });
        setResults(users.filter((u) => u.id !== currentUser?.id));
      } catch {
        // silent - search failures shouldn't be intrusive
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [search, isOpen, participant, oppositeRole, currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) {
      toast.error('Choose someone to meet with.');
      return;
    }
    if (!title.trim()) {
      toast.error('Give the meeting a title.');
      return;
    }
    if (!startTime || !endTime) {
      toast.error('Pick a start and end time.');
      return;
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (end <= start) {
      toast.error('End time must be after start time.');
      return;
    }
    if (start < new Date()) {
      toast.error("You can't schedule a meeting in the past.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createMeeting({
        participantId: participant.id,
        title: title.trim(),
        description: description.trim(),
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      toast.success('Meeting request sent.');
      onScheduled();
      onClose();
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Could not schedule the meeting.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule a meeting" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Participant picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Meeting with
          </label>

          {participant ? (
            <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-md p-2">
              <div className="flex items-center">
                <Avatar src={participant.avatarUrl} alt={participant.name} size="sm" className="mr-2" />
                <span className="text-sm font-medium text-gray-900">{participant.name}</span>
              </div>
              {!presetParticipant && (
                <button
                  type="button"
                  onClick={() => setParticipant(null)}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label="Change participant"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ) : (
            <div>
              <Input
                type="text"
                placeholder={`Search ${oppositeRole}s by name...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                startAdornment={<Search size={16} />}
                fullWidth
              />

              {isSearching && <p className="text-xs text-gray-500 mt-1">Searching...</p>}

              {results.length > 0 && (
                <div className="mt-2 border border-gray-200 rounded-md divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {results.map((u) => (
                    <button
                      type="button"
                      key={u.id}
                      onClick={() => {
                        setParticipant(u);
                        setResults([]);
                      }}
                      className="w-full flex items-center px-3 py-2 hover:bg-gray-50 text-left"
                    >
                      <Avatar src={u.avatarUrl} alt={u.name} size="xs" className="mr-2" />
                      <span className="text-sm text-gray-900">{u.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Input
          label="Title"
          type="text"
          placeholder="e.g. Series A pitch discussion"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          fullWidth
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            className="block w-full rounded-md shadow-sm border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-opacity-50 sm:text-sm"
            rows={3}
            placeholder="Optional agenda or notes..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start time"
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            fullWidth
          />
          <Input
            label="End time"
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            fullWidth
          />
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Send request
          </Button>
        </div>
      </form>
    </Modal>
  );
};
