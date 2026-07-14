import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MessageCircle, Building2, UserCircle, Briefcase } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { getUserById } from '../../services/userService';
import { Investor } from '../../types';

export const InvestorProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser } = useAuth();

  const [investor, setInvestor] = useState<Investor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
        const user = await getUserById(id);
        if (!cancelled) setInvestor(user as Investor);
      } catch {
        if (!cancelled) setInvestor(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!investor || investor.role !== 'investor') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Investor not found</h2>
        <p className="text-gray-600 mt-2">The investor profile you're looking for doesn't exist or has been removed.</p>
        <Link to="/dashboard/entrepreneur">
          <Button variant="outline" className="mt-4">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const isCurrentUser = currentUser?.id === investor.id;
  const investmentInterests = investor.investmentInterests || [];
  const investmentStage = investor.investmentStage || [];
  const portfolioCompanies = investor.portfolioCompanies || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Profile header */}
      <Card>
        <CardBody className="sm:flex sm:items-start sm:justify-between p-6">
          <div className="sm:flex sm:space-x-6">
            <Avatar
              src={investor.avatarUrl}
              alt={investor.name}
              size="xl"
              status={investor.isOnline ? 'online' : 'offline'}
              className="mx-auto sm:mx-0"
            />

            <div className="mt-4 sm:mt-0 text-center sm:text-left">
              <h1 className="text-2xl font-bold text-gray-900">{investor.name}</h1>
              <p className="text-gray-600 flex items-center justify-center sm:justify-start mt-1">
                <Building2 size={16} className="mr-1" />
                Investor{typeof investor.totalInvestments === 'number' ? ` • ${investor.totalInvestments} investments` : ''}
              </p>

              {investmentStage.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-3">
                  {investmentStage.map((stage, index) => (
                    <Badge key={index} variant="secondary" size="sm">{stage}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 sm:mt-0 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
            {!isCurrentUser && (
              <Link to={`/chat/${investor.id}`}>
                <Button leftIcon={<MessageCircle size={18} />}>Message</Button>
              </Link>
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
              <p className="text-gray-700">{investor.bio || 'No bio added yet.'}</p>
            </CardBody>
          </Card>

          {/* Investment Interests */}
          {(investmentInterests.length > 0 || investmentStage.length > 0) && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Investment Interests</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {investmentInterests.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900">Industries</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {investmentInterests.map((interest, index) => (
                          <Badge key={index} variant="primary" size="md">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {investmentStage.length > 0 && (
                    <div>
                      <h3 className="text-md font-medium text-gray-900">Investment Stages</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {investmentStage.map((stage, index) => (
                          <Badge key={index} variant="secondary" size="md">{stage}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Portfolio Companies */}
          {portfolioCompanies.length > 0 && (
            <Card>
              <CardHeader className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">Portfolio Companies</h2>
                <span className="text-sm text-gray-500">{portfolioCompanies.length} companies</span>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolioCompanies.map((company, index) => (
                    <div key={index} className="flex items-center p-3 border border-gray-200 rounded-md">
                      <div className="p-3 bg-primary-50 rounded-md mr-3">
                        <Briefcase size={18} className="text-primary-700" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900">{company}</h3>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Sidebar - right side */}
        {(investor.minimumInvestment || investor.maximumInvestment || typeof investor.totalInvestments === 'number') && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-medium text-gray-900">Investment Details</h2>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {(investor.minimumInvestment || investor.maximumInvestment) && (
                    <div>
                      <span className="text-sm text-gray-500">Investment Range</span>
                      <p className="text-lg font-semibold text-gray-900">
                        {investor.minimumInvestment} - {investor.maximumInvestment}
                      </p>
                    </div>
                  )}

                  {typeof investor.totalInvestments === 'number' && (
                    <div>
                      <span className="text-sm text-gray-500">Total Investments</span>
                      <p className="text-md font-medium text-gray-900">{investor.totalInvestments} companies</p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
