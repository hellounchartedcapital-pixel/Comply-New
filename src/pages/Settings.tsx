import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Users, Bell, Plug, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';
import { fetchOrganizationSettings, upsertOrganizationSettings } from '@/services/settings';

const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]['id'];

function OrganizationTab() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery({
    queryKey: ['organization-settings'],
    queryFn: fetchOrganizationSettings,
  });

  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [additionalInsuredName, setAdditionalInsuredName] = useState('');
  const [glOccurrence, setGlOccurrence] = useState('');
  const [glAggregate, setGlAggregate] = useState('');
  const [autoLiability, setAutoLiability] = useState('');
  const [umbrellaLimit, setUmbrellaLimit] = useState('');
  const [wcRequired, setWcRequired] = useState(false);
  const [aiRequired, setAiRequired] = useState(false);
  const [wosRequired, setWosRequired] = useState(false);

  // Initialize form from fetched settings
  const [initialized, setInitialized] = useState(false);
  if (settings && !initialized) {
    setCompanyName(settings.company_name ?? '');
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: upsertOrganizationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to save settings'),
  });

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full" />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
          <CardDescription>Update your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-address">Address</Label>
            <Input
              id="company-address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder="123 Main St, Suite 100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="additional-insured-name">Additional Insured Name</Label>
            <Input
              id="additional-insured-name"
              value={additionalInsuredName}
              onChange={(e) => setAdditionalInsuredName(e.target.value)}
              placeholder="e.g., ABC Property Management LLC"
            />
            <p className="text-xs text-muted-foreground">
              This name will be used to verify the Additional Insured field on uploaded COI certificates.
            </p>
          </div>
          <Button
            onClick={() =>
              saveMutation.mutate({ company_name: companyName })
            }
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Requirements</CardTitle>
          <CardDescription>
            Set default insurance requirements for new vendors and tenants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-gl">General Liability (Occurrence)</Label>
              <Input
                id="default-gl"
                type="number"
                value={glOccurrence}
                onChange={(e) => setGlOccurrence(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-gl-agg">General Liability (Aggregate)</Label>
              <Input
                id="default-gl-agg"
                type="number"
                value={glAggregate}
                onChange={(e) => setGlAggregate(e.target.value)}
                placeholder="2000000"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-auto">Automobile Liability</Label>
              <Input
                id="default-auto"
                type="number"
                value={autoLiability}
                onChange={(e) => setAutoLiability(e.target.value)}
                placeholder="1000000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-umbrella">Umbrella / Excess</Label>
              <Input
                id="default-umbrella"
                type="number"
                value={umbrellaLimit}
                onChange={(e) => setUmbrellaLimit(e.target.value)}
                placeholder="5000000"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="wc-required" checked={wcRequired} onCheckedChange={setWcRequired} />
            <Label htmlFor="wc-required">Require Workers&apos; Compensation (Statutory)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="ai-required" checked={aiRequired} onCheckedChange={setAiRequired} />
            <Label htmlFor="ai-required">Require Additional Insured</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="wos-required" checked={wosRequired} onCheckedChange={setWosRequired} />
            <Label htmlFor="wos-required">Require Waiver of Subrogation</Label>
          </div>
          <Button
            onClick={() => toast.success('Default requirements saved')}
          >
            Save Defaults
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamTab() {
  const members = [
    { name: 'You', email: 'Current User', role: 'Admin', status: 'active' as const },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage who has access to your organization</CardDescription>
          </div>
          <Button size="sm" variant="outline" disabled>
            Invite Member (Coming Soon)
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.email} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.status === 'active' ? 'success' : 'secondary'}>
                    {member.status}
                  </Badge>
                  <Badge variant="outline">{member.role}</Badge>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Team member invitations will be available in an upcoming release.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
  const [expiringAlerts, setExpiringAlerts] = useState(true);
  const [coiUploaded, setCoiUploaded] = useState(true);
  const [statusChanges, setStatusChanges] = useState(false);
  const [autoFollowUp, setAutoFollowUp] = useState(false);

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Configure when you receive email alerts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Expiring Coverage Alerts</p>
              <p className="text-xs text-muted-foreground">Get notified when coverage is about to expire</p>
            </div>
            <Switch checked={expiringAlerts} onCheckedChange={setExpiringAlerts} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New COI Uploaded</p>
              <p className="text-xs text-muted-foreground">Get notified when a vendor or tenant uploads a COI</p>
            </div>
            <Switch checked={coiUploaded} onCheckedChange={setCoiUploaded} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Compliance Status Changes</p>
              <p className="text-xs text-muted-foreground">Get notified when compliance status changes</p>
            </div>
            <Switch checked={statusChanges} onCheckedChange={setStatusChanges} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto Follow-up</p>
              <p className="text-xs text-muted-foreground">Automatically send follow-up emails for expired or non-compliant entities</p>
            </div>
            <Switch checked={autoFollowUp} onCheckedChange={setAutoFollowUp} />
          </div>
          <Button onClick={() => toast.success('Notification preferences saved')}>
            Save Preferences
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsTab() {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Connect SmartCOI with your other tools</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Email Notifications (Resend)</p>
              <p className="text-sm text-muted-foreground">Send automated follow-up emails</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Property Management System</p>
              <p className="text-sm text-muted-foreground">Sync properties and tenants from AppFolio, Yardi, etc.</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <p className="font-medium">Accounting Software</p>
              <p className="text-sm text-muted-foreground">Sync with QuickBooks, Xero, and more</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingTab() {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold">Professional Plan</p>
              <p className="text-sm text-muted-foreground">Unlimited vendors and tenants</p>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
          <Separator className="my-4" />
          <div className="flex gap-3">
            <Button variant="outline">Manage Subscription</Button>
            <Button variant="outline">View Invoices</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('organization');

  const tabContent: Record<TabId, React.ReactNode> = {
    organization: <OrganizationTab />,
    team: <TeamTab />,
    notifications: <NotificationsTab />,
    integrations: <IntegrationsTab />,
    billing: <BillingTab />,
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your organization settings" />

      <div className="flex flex-col gap-8 md:flex-row">
        <nav className="w-full shrink-0 space-y-1 md:w-48" aria-label="Settings navigation">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="flex-1">{tabContent[activeTab]}</div>
      </div>
    </div>
  );
}
