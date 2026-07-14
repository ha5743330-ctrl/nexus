import React from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { Avatar } from '../ui/Avatar';

interface IncomingCallModalProps {
  callerName: string;
  callerAvatarUrl?: string;
  title?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  callerName,
  callerAvatarUrl,
  title,
  onAccept,
  onDecline,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/70 animate-fade-in">
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
      <p className="text-sm text-gray-500 mb-4">Incoming video call</p>
      <Avatar src={callerAvatarUrl || ''} alt={callerName} size="xl" className="mx-auto mb-4 ring-4 ring-primary-100 animate-pulse" />
      <h2 className="text-lg font-semibold text-gray-900">{callerName}</h2>
      {title && <p className="text-sm text-gray-500 mt-1">{title}</p>}

      <div className="flex items-center justify-center gap-6 mt-8">
        <button
          type="button"
          onClick={onDecline}
          className="flex flex-col items-center gap-2"
          aria-label="Decline call"
        >
          <span className="h-14 w-14 rounded-full bg-error-500 hover:bg-error-600 flex items-center justify-center text-white transition-colors">
            <PhoneOff size={22} />
          </span>
          <span className="text-xs text-gray-500">Decline</span>
        </button>

        <button
          type="button"
          onClick={onAccept}
          className="flex flex-col items-center gap-2"
          aria-label="Accept call"
        >
          <span className="h-14 w-14 rounded-full bg-success-500 hover:bg-success-600 flex items-center justify-center text-white transition-colors">
            <Phone size={22} />
          </span>
          <span className="text-xs text-gray-500">Accept</span>
        </button>
      </div>
    </div>
  </div>
);
