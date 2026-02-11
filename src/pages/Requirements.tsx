import {
  ClipboardCheck,
  Plus,
  Building2,
  Edit,
  Trash2,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { IconContainer } from '@/components/shared/IconContainer';

interface TemplateDisplay {
  id: string;
  name: string;
  entityType: 'vendor' | 'tenant';
  propertyCount: number;
  coverages: Array<{ label: string; value: string; required: boolean }>;
}

const DEMO_TEMPLATES: TemplateDisplay[] = [
  {
    id: '1',
    name: 'Standard Vendor Requirements',
    entityType: 'vendor',
    propertyCount: 5,
    coverages: [
      { label: 'General Liability', value: '$1,000,000 / $2,000,000', required: true },
      { label: 'Automobile Liability', value: '$1,000,000 CSL', required: true },
      { label: "Workers' Compensation", value: 'Statutory', required: true },
      { label: 'Umbrella / Excess', value: '$5,000,000', required: false },
    ],
  },
  {
    id: '2',
    name: 'High-Risk Vendor Requirements',
    entityType: 'vendor',
    propertyCount: 2,
    coverages: [
      { label: 'General Liability', value: '$2,000,000 / $4,000,000', required: true },
      { label: 'Automobile Liability', value: '$2,000,000 CSL', required: true },
      { label: "Workers' Compensation", value: 'Statutory', required: true },
      { label: 'Umbrella / Excess', value: '$10,000,000', required: true },
      { label: 'Professional Liability', value: '$2,000,000', required: true },
    ],
  },
  {
    id: '3',
    name: 'Standard Tenant Requirements',
    entityType: 'tenant',
    propertyCount: 8,
    coverages: [
      { label: 'General Liability', value: '$1,000,000 / $2,000,000', required: true },
      { label: 'Property Insurance', value: '$500,000', required: true },
      { label: 'Business Interruption', value: '12 months', required: false },
    ],
  },
  {
    id: '4',
    name: 'Retail Tenant Requirements',
    entityType: 'tenant',
    propertyCount: 3,
    coverages: [
      { label: 'General Liability', value: '$2,000,000 / $4,000,000', required: true },
      { label: 'Property Insurance', value: '$1,000,000', required: true },
      { label: 'Business Interruption', value: '18 months', required: true },
      { label: "Workers' Compensation", value: 'Statutory', required: true },
    ],
  },
];

function TemplateCard({ template }: { template: TemplateDisplay }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <IconContainer icon={Shield} />
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-0.5">
                <Building2 className="h-3 w-3" />
                {template.propertyCount} properties
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit template">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Delete template">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {template.coverages.map((coverage, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-1.5">
            <span className="text-sm">{coverage.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{coverage.value}</span>
              <Badge variant={coverage.required ? 'success' : 'secondary'} className="text-[10px]">
                {coverage.required ? 'Required' : 'Optional'}
              </Badge>
            </div>
          </div>
        ))}
        <Button variant="outline" size="sm" className="w-full mt-3">
          Apply Template
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Requirements() {
  const vendorTemplates = DEMO_TEMPLATES.filter((t) => t.entityType === 'vendor');
  const tenantTemplates = DEMO_TEMPLATES.filter((t) => t.entityType === 'tenant');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Requirements"
        subtitle="Manage insurance requirement templates"
        actions={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        }
      />

      <Tabs defaultValue="vendor">
        <TabsList>
          <TabsTrigger value="vendor">Vendor Templates</TabsTrigger>
          <TabsTrigger value="tenant">Tenant Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="vendor">
          {vendorTemplates.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No vendor templates"
              description="Create a requirement template to quickly apply insurance requirements to vendors."
              actionLabel="Create Template"
              onAction={() => {}}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {vendorTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="tenant">
          {tenantTemplates.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No tenant templates"
              description="Create a requirement template to quickly apply insurance requirements to tenants."
              actionLabel="Create Template"
              onAction={() => {}}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {tenantTemplates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
