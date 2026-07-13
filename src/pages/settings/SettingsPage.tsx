import React, { useState } from 'react';
import { User as UserIcon, Lock, Bell, Globe, Palette, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { Entrepreneur, Investor } from '../../types';

// Fields we let the person edit, split by role. Email and role are
// intentionally excluded - the backend doesn't allow changing them here.
interface EntrepreneurFormData {
  name: string;
  bio: string;
  startupName: string;
  pitchSummary: string;
  fundingNeeded: string;
  industry: string;
  location: string;
  foundedYear: number | '';
  teamSize: number | '';
}

interface InvestorFormData {
  name: string;
  bio: string;
  investmentInterests: string; // comma-separated in the form, array on the backend
  investmentStage: string; // comma-separated in the form, array on the backend
  minimumInvestment: string;
  maximumInvestment: string;
}

const toEntrepreneurForm = (user: Entrepreneur): EntrepreneurFormData => ({
  name: user.name || '',
  bio: user.bio || '',
  startupName: user.startupName || '',
  pitchSummary: user.pitchSummary || '',
  fundingNeeded: user.fundingNeeded || '',
  industry: user.industry || '',
  location: user.location || '',
  foundedYear: user.foundedYear ?? '',
  teamSize: user.teamSize ?? '',
});

const toInvestorForm = (user: Investor): InvestorFormData => ({
  name: user.name || '',
  bio: user.bio || '',
  investmentInterests: (user.investmentInterests || []).join(', '),
  investmentStage: (user.investmentStage || []).join(', '),
  minimumInvestment: user.minimumInvestment || '',
  maximumInvestment: user.maximumInvestment || '',
});

export const SettingsPage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const [entrepreneurForm, setEntrepreneurForm] = useState<EntrepreneurFormData | null>(
    user?.role === 'entrepreneur' ? toEntrepreneurForm(user as Entrepreneur) : null
  );
  const [investorForm, setInvestorForm] = useState<InvestorFormData | null>(
    user?.role === 'investor' ? toInvestorForm(user as Investor) : null
  );

  if (!user) return null;

  const handleEntrepreneurChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEntrepreneurForm((prev) =>
      prev
        ? {
            ...prev,
            [name]: name === 'foundedYear' || name === 'teamSize' ? (value === '' ? '' : Number(value)) : value,
          }
        : prev
    );
  };

  const handleInvestorChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInvestorForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleCancel = () => {
    if (user.role === 'entrepreneur') setEntrepreneurForm(toEntrepreneurForm(user as Entrepreneur));
    if (user.role === 'investor') setInvestorForm(toInvestorForm(user as Investor));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (user.role === 'entrepreneur' && entrepreneurForm) {
        await updateProfile(user.id, {
          name: entrepreneurForm.name,
          bio: entrepreneurForm.bio,
          startupName: entrepreneurForm.startupName,
          pitchSummary: entrepreneurForm.pitchSummary,
          fundingNeeded: entrepreneurForm.fundingNeeded,
          industry: entrepreneurForm.industry,
          location: entrepreneurForm.location,
          foundedYear: entrepreneurForm.foundedYear === '' ? undefined : entrepreneurForm.foundedYear,
          teamSize: entrepreneurForm.teamSize === '' ? undefined : entrepreneurForm.teamSize,
        } as Partial<Entrepreneur>);
      } else if (user.role === 'investor' && investorForm) {
        await updateProfile(user.id, {
          name: investorForm.name,
          bio: investorForm.bio,
          investmentInterests: investorForm.investmentInterests
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          investmentStage: investorForm.investmentStage
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          minimumInvestment: investorForm.minimumInvestment,
          maximumInvestment: investorForm.maximumInvestment,
        } as Partial<Investor>);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your account preferences and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings navigation */}
        <Card className="lg:col-span-1">
          <CardBody className="p-2">
            <nav className="space-y-1">
              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-md">
                <UserIcon size={18} className="mr-3" />
                Profile
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Lock size={18} className="mr-3" />
                Security
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Bell size={18} className="mr-3" />
                Notifications
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Globe size={18} className="mr-3" />
                Language
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <Palette size={18} className="mr-3" />
                Appearance
              </button>

              <button className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md">
                <CreditCard size={18} className="mr-3" />
                Billing
              </button>
            </nav>
          </CardBody>
        </Card>

        {/* Main settings content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Profile Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar src={user.avatarUrl} alt={user.name} size="xl" />

                <div>
                  <Button variant="outline" size="sm" disabled>
                    Change Photo
                  </Button>
                  <p className="mt-2 text-sm text-gray-500">
                    Photo upload isn't wired up yet - coming with the Document Chamber module.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  name="name"
                  value={user.role === 'entrepreneur' ? entrepreneurForm?.name : investorForm?.name}
                  onChange={user.role === 'entrepreneur' ? handleEntrepreneurChange : handleInvestorChange}
                />

                <Input label="Email" type="email" value={user.email} disabled />

                <Input label="Role" value={user.role} disabled />

                {user.role === 'entrepreneur' && entrepreneurForm && (
                  <Input
                    label="Location"
                    name="location"
                    value={entrepreneurForm.location}
                    onChange={handleEntrepreneurChange}
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  name="bio"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  rows={4}
                  value={user.role === 'entrepreneur' ? entrepreneurForm?.bio : investorForm?.bio}
                  onChange={user.role === 'entrepreneur' ? handleEntrepreneurChange : handleInvestorChange}
                ></textarea>
              </div>

              {/* Entrepreneur-specific fields */}
              {user.role === 'entrepreneur' && entrepreneurForm && (
                <div className="pt-6 border-t border-gray-200 space-y-6">
                  <h3 className="text-sm font-medium text-gray-900">Startup Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Startup Name"
                      name="startupName"
                      value={entrepreneurForm.startupName}
                      onChange={handleEntrepreneurChange}
                    />
                    <Input
                      label="Industry"
                      name="industry"
                      value={entrepreneurForm.industry}
                      onChange={handleEntrepreneurChange}
                    />
                    <Input
                      label="Funding Needed"
                      name="fundingNeeded"
                      placeholder="e.g. $500,000"
                      value={entrepreneurForm.fundingNeeded}
                      onChange={handleEntrepreneurChange}
                    />
                    <Input
                      label="Founded Year"
                      name="foundedYear"
                      type="number"
                      value={entrepreneurForm.foundedYear}
                      onChange={handleEntrepreneurChange}
                    />
                    <Input
                      label="Team Size"
                      name="teamSize"
                      type="number"
                      value={entrepreneurForm.teamSize}
                      onChange={handleEntrepreneurChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pitch Summary
                    </label>
                    <textarea
                      name="pitchSummary"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                      rows={3}
                      value={entrepreneurForm.pitchSummary}
                      onChange={handleEntrepreneurChange}
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Investor-specific fields */}
              {user.role === 'investor' && investorForm && (
                <div className="pt-6 border-t border-gray-200 space-y-6">
                  <h3 className="text-sm font-medium text-gray-900">Investment Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Investment Interests"
                      name="investmentInterests"
                      placeholder="e.g. Fintech, Climate Tech"
                      helperText="Comma-separated"
                      value={investorForm.investmentInterests}
                      onChange={handleInvestorChange}
                    />
                    <Input
                      label="Investment Stage"
                      name="investmentStage"
                      placeholder="e.g. Seed, Series A"
                      helperText="Comma-separated"
                      value={investorForm.investmentStage}
                      onChange={handleInvestorChange}
                    />
                    <Input
                      label="Minimum Investment"
                      name="minimumInvestment"
                      placeholder="e.g. $25,000"
                      value={investorForm.minimumInvestment}
                      onChange={handleInvestorChange}
                    />
                    <Input
                      label="Maximum Investment"
                      name="maximumInvestment"
                      placeholder="e.g. $1,000,000"
                      value={investorForm.maximumInvestment}
                      onChange={handleInvestorChange}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSave} isLoading={isSaving}>
                  Save Changes
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
            </CardHeader>
            <CardBody className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-4">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Add an extra layer of security to your account
                    </p>
                    <Badge variant="error" className="mt-1">Not Enabled</Badge>
                  </div>
                  <Button variant="outline" disabled title="Coming with the 2FA settings toggle">
                    Enable
                  </Button>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Change Password</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Use "Forgot password" from the login screen to reset your password by email for now.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};
