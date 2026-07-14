import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, Plus, Video, Check, X as XIcon, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isPast } from 'date-fns';
import { Card, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge, BadgeVariant } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { ScheduleMeetingModal } from '../../components/meetings/ScheduleMeetingModal';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Meeting, MeetingStatus } from '../../types';
import { listMyMeetings, updateMeetingStatus, deleteMeeting } from '../../services/meetingService';

type TabKey = 'upcoming' | 'pending' | 'past';

const statusVariant: Record<MeetingStatus, BadgeVariant> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  cancelled: 'gray',
  completed: 'secondary',
};

export const MeetingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { startCall } = useCall();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadMeetings = async () => {
    setIsLoading(true);
    try {
      const data = await listMyMeetings();
      setMeetings(data);
    } catch {
      toast.error('Could not load your meetings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const grouped = useMemo(() => {
    const upcoming: Meeting[] = [];
    const pending: Meeting[] = [];
    const past: Meeting[] = [];

    meetings.forEach((m) => {
      const ended = isPast(new Date(m.endTime));
      if (['cancelled', 'rejected', 'completed'].includes(m.status) || ended) {
        past.push(m);
      } else if (m.status === 'pending') {
        pending.push(m);
      } else {
        upcoming.push(m);
      }
    });

    const byStartAsc = (a: Meeting, b: Meeting) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    const byStartDesc = (a: Meeting, b: Meeting) =>
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime();

    return {
      upcoming: upcoming.sort(byStartAsc),
      pending: pending.sort(byStartAsc),
      past: past.sort(byStartDesc),
    };
  }, [meetings]);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: grouped.upcoming.length },
    { key: 'pending', label: 'Pending', count: grouped.pending.length },
    { key: 'past', label: 'Past', count: grouped.past.length },
  ];

  const handleStatusChange = async (
    meetingId: string,
    status: 'accepted' | 'rejected' | 'cancelled' | 'completed'
  ) => {
    setBusyId(meetingId);
    try {
      const updated = await updateMeetingStatus(meetingId, status);
      setMeetings((prev) => prev.map((m) => (m.id === meetingId ? updated : m)));
      toast.success(
        status === 'accepted'
          ? 'Meeting accepted.'
          : status === 'rejected'
          ? 'Meeting declined.'
          : status === 'cancelled'
          ? 'Meeting cancelled.'
          : 'Meeting marked complete.'
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update the meeting.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (meetingId: string) => {
    setBusyId(meetingId);
    try {
      await deleteMeeting(meetingId);
      setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
      toast.success('Meeting deleted.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Only the organizer can delete this meeting.');
    } finally {
      setBusyId(null);
    }
  };

  if (!currentUser) return null;

  const activeMeetings = grouped[activeTab];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500 mt-1">Schedule and manage your meetings</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setIsModalOpen(true)} className="mt-4 sm:mt-0">
          Schedule meeting
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.key ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      ) : activeMeetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-gray-100 p-4 rounded-full mb-4">
            <Calendar size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-700">
            {activeTab === 'upcoming' && 'No upcoming meetings'}
            {activeTab === 'pending' && 'No pending requests'}
            {activeTab === 'past' && 'No past meetings'}
          </h3>
          <p className="text-gray-500 mt-1">
            {activeTab === 'pending'
              ? 'Meeting requests waiting on a response will show up here'
              : 'Schedule a meeting to get started'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeMeetings.map((meeting) => {
            const otherUser =
              meeting.organizer.id === currentUser.id ? meeting.participant : meeting.organizer;
            const isOrganizer = meeting.organizer.id === currentUser.id;
            const isInvitedParticipant = meeting.participant.id === currentUser.id;
            const isBusy = busyId === meeting.id;

            return (
              <Card key={meeting.id}>
                <CardBody>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-start">
                      <Avatar src={otherUser.avatarUrl} alt={otherUser.name} size="md" className="mr-3" />
                      <div>
                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="font-medium text-gray-900">{meeting.title}</h3>
                          <Badge variant={statusVariant[meeting.status]} size="sm">
                            {meeting.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          with {otherUser.name} {isOrganizer && '(you organized this)'}
                        </p>
                        {meeting.description && (
                          <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                        )}
                        <div className="flex items-center text-sm text-gray-500 mt-2 gap-4">
                          <span className="flex items-center">
                            <Calendar size={14} className="mr-1" />
                            {format(new Date(meeting.startTime), 'MMM d, yyyy')}
                          </span>
                          <span className="flex items-center">
                            <Clock size={14} className="mr-1" />
                            {format(new Date(meeting.startTime), 'h:mm a')} -{' '}
                            {format(new Date(meeting.endTime), 'h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      {meeting.status === 'pending' && isInvitedParticipant && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            leftIcon={<Check size={14} />}
                            isLoading={isBusy}
                            onClick={() => handleStatusChange(meeting.id, 'accepted')}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={<XIcon size={14} />}
                            isLoading={isBusy}
                            onClick={() => handleStatusChange(meeting.id, 'rejected')}
                          >
                            Decline
                          </Button>
                        </>
                      )}

                      {meeting.status === 'accepted' && meeting.roomId && (
                        <Button
                          size="sm"
                          variant="primary"
                          leftIcon={<Video size={14} />}
                          onClick={() =>
                            startCall(
                              { id: otherUser.id, name: otherUser.name, avatarUrl: otherUser.avatarUrl },
                              meeting.roomId!,
                              meeting.title
                            )
                          }
                        >
                          Join
                        </Button>
                      )}

                      {['pending', 'accepted'].includes(meeting.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Ban size={14} />}
                          isLoading={isBusy}
                          onClick={() => handleStatusChange(meeting.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      )}

                      {isOrganizer && activeTab === 'past' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          isLoading={isBusy}
                          onClick={() => handleDelete(meeting.id)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      <ScheduleMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onScheduled={loadMeetings}
      />
    </div>
  );
};
