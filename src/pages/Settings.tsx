import { useState } from 'react';
import { Building2, Users, Bell, Plug, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/PageHeader';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'billing', label: 'Billing', icon: CreditCard },
] as const;

type TabId = (typeof TABS)[number]['id'];

function OrganizationTab() {
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
            <Input id="company-name" placeholder="Your Company Name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company-address">Address</Label>
            <Input id="company-address" placeholder="123 Main St, Suite 100" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="additional-insured-name">Additional Insured Name</Label>
            <Input id="additional-insured-name" placeholder="e.g., ABC Property Management LLC" />
            <p className="text-xs text-muted-foreground">
              This name will be used to verify the Additional Insured field on uploaded COI certificates.
            </p>
          </div>
          <Button>Save Changes</Button>
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
              <Input id="default-gl" type="number" placeholder="1000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-gl-agg">General Liability (Aggregate)</Label>
              <Input id="default-gl-agg" type="number" placeholder="2000000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-auto">Automobile Liability</Label>
              <Input id="default-auto" type="number" placeholder="1000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-umbrella">Umbrella / Excess</Label>
              <Input id="default-umbrella" type="number" placeholder="5000000" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="wc-required" />
            <Label htmlFor="wc-required">Require Workers&apos; Compensation (Statutory)</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="ai-required" />
            <Label htmlFor="ai-required">Require Additional Insured</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="wos-required" />
            <Label htmlFor="wos-required">Require Waiver of Subrogation</Label>
          </div>
          <Button>Save Defaults</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamTab() {
  const members = [
    { name: 'Jane Smith', email: 'jane@company.com', role: 'Admin', status: 'active' as const },
    { name: 'Bob Johnson', email: 'bob@company.com', role: 'Manager', status: 'active' as const },
    { name: 'Alice Williams', email: 'alice@company.com', role: 'Viewer', status: 'pending' as const },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>Manage who has access to your organization</CardDescription>
          </div>
          <Button size="sm">Invite Member</Button>
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
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsTab() {
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
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">New COI Uploaded</p>
              <p className="text-xs text-muted-foreground">Get notified when a vendor or tenant uploads a COI</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Compliance Status Changes</p>
              <p className="text-xs text-muted-foreground">Get notified when compliance status changes</p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto Follow-up</p>
              <p className="text-xs text-muted-foreground">Automatically send follow-up emails for expired or non-compliant entities</p>
            </div>
            <Switch />
          </div>
          <Button>Save Preferences</Button>
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

      <div className="flex gap-8">
        <nav className="w-48 shrink-0 space-y-1" aria-label="Settings navigation">
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
