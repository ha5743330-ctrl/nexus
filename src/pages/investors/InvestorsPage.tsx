import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { InvestorCard } from '../../components/investor/InvestorCard';
import { Investor } from '../../types';
import { listUsersByRole } from '../../services/userService';

export const InvestorsPage: React.FC = () => {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const { users } = await listUsersByRole('investor', { limit: 100 });
        setInvestors(users as Investor[]);
      } catch {
        toast.error('Could not load investors.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Get unique investment stages and interests (defensive - profile fields may not be filled in yet)
  const allStages = useMemo(
    () => Array.from(new Set(investors.flatMap((i) => i.investmentStage || []))),
    [investors]
  );
  const allInterests = useMemo(
    () => Array.from(new Set(investors.flatMap((i) => i.investmentInterests || []))),
    [investors]
  );

  // Filter investors based on search and filters
  const filteredInvestors = investors.filter((investor) => {
    const bio = investor.bio || '';
    const interests = investor.investmentInterests || [];
    const stages = investor.investmentStage || [];

    const matchesSearch =
      searchQuery === '' ||
      investor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interests.some((interest) => interest.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStages = selectedStages.length === 0 || stages.some((stage) => selectedStages.includes(stage));

    const matchesInterests =
      selectedInterests.length === 0 || interests.some((interest) => selectedInterests.includes(interest));

    return matchesSearch && matchesStages && matchesInterests;
  });

  const toggleStage = (stage: string) => {
    setSelectedStages((prev) => (prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]));
  };

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Investors</h1>
        <p className="text-gray-600">Connect with investors who match your startup's needs</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              {allStages.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Investment Stage</h3>
                  <div className="space-y-2">
                    {allStages.map((stage) => (
                      <button
                        key={stage}
                        onClick={() => toggleStage(stage)}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          selectedStages.includes(stage)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {allInterests.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Investment Interests</h3>
                  <div className="flex flex-wrap gap-2">
                    {allInterests.map((interest) => (
                      <Badge
                        key={interest}
                        variant={selectedInterests.includes(interest) ? 'primary' : 'gray'}
                        className="cursor-pointer"
                        onClick={() => toggleInterest(interest)}
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search investors by name, interests, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">{filteredInvestors.length} results</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredInvestors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredInvestors.map((investor) => (
                <InvestorCard key={investor.id} investor={investor} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No investors match your search.</div>
          )}
        </div>
      </div>
    </div>
  );
};
