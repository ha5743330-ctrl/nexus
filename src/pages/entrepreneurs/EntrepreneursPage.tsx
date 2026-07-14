import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { EntrepreneurCard } from '../../components/entrepreneur/EntrepreneurCard';
import { Entrepreneur } from '../../types';
import { listUsersByRole } from '../../services/userService';

export const EntrepreneursPage: React.FC = () => {
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const { users } = await listUsersByRole('entrepreneur', { limit: 100 });
        setEntrepreneurs(users as Entrepreneur[]);
      } catch {
        toast.error('Could not load startups.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Defensive - profile fields may not be filled in yet for new accounts
  const allIndustries = useMemo(
    () => Array.from(new Set(entrepreneurs.map((e) => e.industry).filter(Boolean))),
    [entrepreneurs]
  );

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Startups</h1>
        <p className="text-gray-600">Discover promising startups looking for investment</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              {allIndustries.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Industry</h3>
                  <div className="space-y-2">
                    {allIndustries.map((industry) => (
                      <button
                        key={industry}
                        onClick={() => toggleIndustry(industry)}
                        className={`block w-full text-left px-3 py-2 rounded-md text-sm ${
                          selectedIndustries.includes(industry)
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {industry}
                      </button>
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
              placeholder="Search startups by name, industry, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startAdornment={<Search size={18} />}
              fullWidth
            />

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-500" />
              <span className="text-sm text-gray-600">{filteredEntrepreneurs.length} results</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredEntrepreneurs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEntrepreneurs.map((entrepreneur) => (
                <EntrepreneurCard key={entrepreneur.id} entrepreneur={entrepreneur} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">No startups match your search.</div>
          )}
        </div>
      </div>
    </div>
  );
};
