import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, PieChart, Filter, Search, PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { EntrepreneurCard } from '../../components/entrepreneur/EntrepreneurCard';
import { useAuth } from '../../context/AuthContext';
import { Entrepreneur, CollaborationRequest } from '../../types';
import { listUsersByRole } from '../../services/userService';
import { listMyConnectionRequests } from '../../services/connectionRequestService';

export const InvestorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [sentRequests, setSentRequests] = useState<CollaborationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setIsLoading(true);
      try {
        const [entrepreneursResult, requests] = await Promise.all([
          listUsersByRole('entrepreneur', { limit: 100 }),
          listMyConnectionRequests(),
        ]);
        setEntrepreneurs(entrepreneursResult.users as Entrepreneur[]);
        setSentRequests(requests);
      } catch {
        toast.error('Could not load your dashboard.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user]);

  const industries = useMemo(
    () => Array.from(new Set(entrepreneurs.map((e) => e.industry).filter(Boolean))),
    [entrepreneurs]
  );

  if (!user) return null;

  const filteredEntrepreneurs = entrepreneurs.filter((entrepreneur) => {
    const startupName = entrepreneur.startupName || '';
    const industry = entrepreneur.industry || '';
    const pitchSummary = entrepreneur.pitchSummary || '';

    const matchesSearch =
      searchQuery === '' ||
      entrepreneur.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      startupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pitchSummary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesIndustry = selectedIndustries.length === 0 || selectedIndustries.includes(industry);

    return matchesSearch && matchesIndustry;
  });

  const toggleIndustry = (industry: string) => {
    setSelectedIndustries((prev) =>
      prev.includes(industry) ? prev.filter((i) => i !== industry) : [...prev, industry]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Discover Startups</h1>
          <p className="text-gray-600">Find and connect with promising entrepreneurs</p>
        </div>

        <Link to="/entrepreneurs">
          <Button leftIcon={<PlusCircle size={18} />}>View All Startups</Button>
        </Link>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-2/3">
          <Input
            placeholder="Search startups, industries, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            fullWidth
            startAdornment={<Search size={18} />}
          />
        </div>

        {industries.length > 0 && (
          <div className="w-full md:w-1/3">
            <div className="flex items-center space-x-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by:</span>

              <div className="flex flex-wrap gap-2">
                {industries.map((industry) => (
                  <Badge
                    key={industry}
                    variant={selectedIndustries.includes(industry) ? 'primary' : 'gray'}
                    className="cursor-pointer"
                    onClick={() => toggleIndustry(industry)}
                  >
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-primary-50 border border-primary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-full mr-4">
                <Users size={20} className="text-primary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700">Total Startups</p>
                <h3 className="text-xl font-semibold text-primary-900">{entrepreneurs.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-secondary-50 border border-secondary-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 rounded-full mr-4">
                <PieChart size={20} className="text-secondary-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-secondary-700">Industries</p>
                <h3 className="text-xl font-semibold text-secondary-900">{industries.length}</h3>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="bg-accent-50 border border-accent-100">
          <CardBody>
            <div className="flex items-center">
              <div className="p-3 bg-accent-100 rounded-full mr-4">
                <Users size={20} className="text-accent-700" />
              </div>
              <div>
                <p className="text-sm font-medium text-accent-700">Your Connections</p>
                <h3 className="text-xl font-semibold text-accent-900">
                  {sentRequests.filter((req) => req.status === 'accepted').length}
                </h3>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Entrepreneurs grid */}
      <div>
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Featured Startups</h2>
          </CardHeader>

          <CardBody>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-6 w-6 border-4 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : filteredEntrepreneurs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEntrepreneurs.map((entrepreneur) => (
                  <EntrepreneurCard key={entrepreneur.id} entrepreneur={entrepreneur} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">No startups match your filters</p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedIndustries([]);
                  }}
                >
                  Clear filters
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
