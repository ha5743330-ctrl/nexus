import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Users, Calendar, Building2, MapPin, UserCircle, FileText, DollarSign, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getUserById } from '../../services/userService';
import { listMyDocuments, fileUrl } from '../../services/documentService';
import { listMyConnectionRequests, sendConnectionRequest } from '../../services/connectionRequestService';
import { Entrepreneur, Document } from '../../types';

export const EntrepreneurProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [entrepreneur, setEntrepreneur] = useState<Entrepreneur | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([]);
  const [hasRequestedCollaboration, setHasRequestedCollaboration] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const user = await getUserById(id);
        if (!cancelled) setEntrepreneur(user as Entrepreneur);
      } catch {
        if (!cancelled) setEntrepreneur(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }

      // Documents this entrepreneur has shared with the current viewer (or their own, if it's their profile)
      try {
        const docs = await listMyDocuments();
        if (!cancelled) setSharedDocuments(docs.filter((d) => d.ownerId === id));
      } catch {
        // non-critical - profile still renders without the documents card
      }

      if (currentUser?.role === 'investor') {
        try {
          const requests = await listMyConnectionRequests();
          if (!cancelled) {
            setHasRequestedCollaboration(requests.some((r) => r.entrepreneurId === id));
          }
        } catch {
          // non-critical
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, currentUser]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!entrepreneur || entrepreneur.role !== 'entrepreneur') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Entrepreneur not found</h2>
        <p className="text-gray-600 mt-2">The entrepreneur profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard/investor">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = currentUser?.id === entrepreneur.id;
  const isInvestor = currentUser?.role === 'investor';

  const handleSendRequest = async () => {
    if (!isInvestor || !id) return;
    setIsSendingRequest(true);
    try {
      await sendConnectionRequest(
        id,
        `I'm interested in learning more about ${entrepreneur.startupName || entrepreneur.name} and would like to explore potential investment opportunities.`
      );
      setHasRequestedCollaboration(true);
      toast.success('Collaboration request sent.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not send the request.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={entrepreneur.avatarUrl}
              alt={entrepreneur.name}
              size="xl"
              status={entrepreneur.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />

            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{entrepreneur.name}</h1>
              {entrepreneur.startupName && (
                <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                  <Building2 size={16} className="mr-1" />
                  Founder at {entrepreneur.startupName}
                </p>
              )}

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                {entrepreneur.industry && <Badge variant="primary">{entrepreneur.industry}</Badge>}
                {entrepreneur.location && (
                  <Badge variant="gray">
                    <MapPin size={14} className="mr-1" />
                    {entrepreneur.location}
                  </Badge>
                )}
                {entrepreneur.foundedYear && (
                  <Badge variant="accent">
                    <Calendar size={14} className="mr-1" />
                    Founded {entrepreneur.foundedYear}
                  </Badge>
                )}
                {entrepreneur.teamSize && (
                  <Badge variant="secondary">
                    <Users size={14} className="mr-1" />
                    {entrepreneur.teamSize} team members
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <>
                <Link to={`/chat/${entrepreneur.id}`}>
                  <Button variant="outline" leftIcon={<MessageCircle size={18} />}>
                    Message
                  </Button>
                </Link>

                {isInvestor && (
                  <Button
                    leftIcon={<Send size={18} />}
                    disabled={hasRequestedCollaboration}
                    isLoading={isSendingRequest}
                    onClick={handleSendRequest}
                  >
                    {hasRequestedCollaboration ? 'Request Sent' : 'Request Collaboration'}
                  </Button>
                )}
              </>
            )}

            {isCurrentUser && (
              <Link to="/settings">
                <Button variant="outline" leftIcon={<UserCircle size={18} />}>
                  Edit Profile
                </Button>
              </Link>
            )}
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">About</h2>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700">{entrepreneur.bio || 'No bio added yet.'}</p>
            </CardBody>
          </Card>

          {/* Startup Overview */}
          {entrepreneur.pitchSummary && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Startup Overview</h2>
              </CardHeader>
              <CardBody>
                <p className="text-gray-700">{entrepreneur.pitchSummary}</p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar - right side */}
        <div className="space-y-6">
          {/* Funding Details */}
          {entrepreneur.fundingNeeded && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Funding</h2>
              </CardHeader>
              <CardBody>
                <span className="text-sm text-gray-500">Funding Needed</span>
                <div className="flex items-center mt-1">
                  <DollarSign size={18} className="text-accent-600 mr-1" />
                  <p className="text-lg font-semibold text-gray-900">{entrepreneur.fundingNeeded}</p>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Documents shared with the viewer (or owned, if this is your own profile) */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">
                {isCurrentUser ? 'My Documents' : 'Shared Documents'}
              </h2>
            </CardHeader>
            <CardBody>
              {sharedDocuments.length > 0 ? (
                <div className="space-y-3">
                  {sharedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-2 bg-primary-50 rounded-md mr-3">
                        <FileText size={18} className="text-primary-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{doc.name}</h3>
                        <p className="text-xs text-gray-500">{doc.type} &middot; {doc.size}</p>
                      </div>
                      <a href={fileUrl(doc.url)} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="outline" size="sm">View</Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {isCurrentUser
                    ? "You haven't uploaded any documents yet."
                    : 'Nothing has been shared with you yet.'}
                </p>
              )}

              {!isCurrentUser && isInvestor && !hasRequestedCollaboration && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Send a collaboration request to start a conversation about deeper access.
                  </p>
                  <Button className="mt-3 w-full" isLoading={isSendingRequest} onClick={handleSendRequest}>
                    Request Collaboration
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
