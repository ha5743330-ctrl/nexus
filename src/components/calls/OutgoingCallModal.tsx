import React from 'react';
import { PhoneOff } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

interface OutgoingCallModalProps {
  calleeName: string;
  calleeAvatarUrl?: string;
  onCancel: () => void;
}

export const OutgoingCallModal: React.FC<OutgoingCallModalProps> = ({
  calleeName,
  calleeAvatarUrl,
  onCancel,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
      <p className="text-sm text-gray-500 mb-4">Calling...</p>
      <Avatar
        src={calleeAvatarUrl || ''}
        alt={calleeName}
        size="xl"
        className="mx-auto mb-4 ring-4 ring-primary-100 animate-pulse"
      />
      <h2 className="text-lg font-semibold text-gray-900">{calleeName}</h2>
      <p className="text-sm text-gray-400 mt-1">Ringing...</p>

      <div className="flex items-center justify-center mt-8">
        <button
          type="button"
          onClick={onCancel}
          className="flex flex-col items-center gap-2"
          aria-label="Cancel call"
        >
          <span className="h-14 w-14 rounded-full bg-error-500 hover:bg-error-600 flex items-center justify-center text-white transition-colors">
            <PhoneOff size={22} />
          </span>
          <span className="text-xs text-gray-500">Cancel</span>
        </button>
      </div>
    </div>
  </div>
);
