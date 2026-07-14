import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { CollaborationRequest } from '../../types';
import { Card, CardBody, CardFooter } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { updateConnectionRequestStatus } from '../../services/connectionRequestService';

interface CollaborationRequestCardProps {
  request: CollaborationRequest;
  /** Which side this card is being shown to - determines whose name/avatar to display */
  viewAs: 'entrepreneur' | 'investor';
  onStatusUpdate?: (requestId: string, status: 'accepted' | 'rejected') => void;
}

export const CollaborationRequestCard: React.FC<CollaborationRequestCardProps> = ({
  request,
  viewAs,
  onStatusUpdate,
}) => {
  const navigate = useNavigate();
  const [isUpdating, setIsUpdating] = useState(false);

  // When an entrepreneur views this card, show the investor who sent it (and vice versa)
  const otherPartyId = viewAs === 'entrepreneur' ? request.investorId : request.entrepreneurId;
  const otherPartyName = viewAs === 'entrepreneur' ? request.investorName : request.entrepreneurName;
  const otherPartyAvatar =
    viewAs === 'entrepreneur' ? request.investorAvatarUrl : request.entrepreneurAvatarUrl;

  const handleAccept = async () => {
    setIsUpdating(true);
    try {
      await updateConnectionRequestStatus(request.id, 'accepted');
      onStatusUpdate?.(request.id, 'accepted');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not accept the request.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    setIsUpdating(true);
    try {
      await updateConnectionRequestStatus(request.id, 'rejected');
      onStatusUpdate?.(request.id, 'rejected');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not decline the request.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMessage = () => navigate(`/chat/${otherPartyId}`);
  const handleViewProfile = () => navigate(`/profile/${viewAs === 'entrepreneur' ? 'investor' : 'entrepreneur'}/${otherPartyId}`);

  const getStatusBadge = () => {
    switch (request.status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'accepted':
        return <Badge variant="success">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="error">Declined</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="transition-all duration-300">
      <CardBody className="flex flex-col">
        <div className="flex justify-between items-start">
          <div className="flex items-start">
            <Avatar src={otherPartyAvatar} alt={otherPartyName} size="md" className="mr-3" />
            <div>
              <h3 className="text-md font-semibold text-gray-900">{otherPartyName}</h3>
              <p className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {request.message && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">{request.message}</p>
          </div>
        )}
      </CardBody>

      <CardFooter className="border-t border-gray-100 bg-gray-50">
        {request.status === 'pending' && viewAs === 'entrepreneur' ? (
          <div className="flex justify-between w-full">
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<X size={16} />}
                isLoading={isUpdating}
                onClick={handleReject}
              >
                Decline
              </Button>
              <Button
                variant="success"
                size="sm"
                leftIcon={<Check size={16} />}
                isLoading={isUpdating}
                onClick={handleAccept}
              >
                Accept
              </Button>
            </div>

            <Button variant="primary" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
              Message
            </Button>
          </div>
        ) : (
          <div className="flex justify-between w-full">
            <Button variant="outline" size="sm" leftIcon={<MessageCircle size={16} />} onClick={handleMessage}>
              Message
            </Button>

            <Button variant="primary" size="sm" onClick={handleViewProfile}>
              View Profile
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};
