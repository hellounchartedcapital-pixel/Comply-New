import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, ArrowLeft, Truck, Users, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchProperty } from '@/services/properties';
import { fetchVendors } from '@/services/vendors';
import { fetchTenants } from '@/services/tenants';
import { formatDate } from '@/lib/utils';

export default function PropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: property, isLoading: propLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id!),
    enabled: !!id,
  });

  const { data: vendorData, isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors', 'property', id],
    queryFn: () => fetchVendors({ propertyId: id, pageSize: 100 }),
    enabled: !!id,
  });

  const { data: tenantData, isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants', 'property', id],
    queryFn: () => fetchTenants({ propertyId: id, pageSize: 100 }),
    enabled: !!id,
  });

  const isLoading = propLoading || vendorsLoading || tenantsLoading;
  const vendors = vendorData?.data ?? [];
  const tenants = tenantData?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <EmptyState
        icon={Building2}
        title="Property not found"
        description="The property you're looking for doesn't exist."
        actionLabel="Back to Properties"
        onAction={() => navigate('/properties')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/properties')} aria-label="Back to properties">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title={property.name}
          subtitle={`${property.address ?? 'No address set'}${property.ownership_entity ? ` \u00B7 ${property.ownership_entity}` : ''}`}
          actions={
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Building Settings
            </Button>
          }
        />
      </div>

      <Tabs defaultValue="vendors">
        <TabsList>
          <TabsTrigger value="vendors" className="gap-2">
            <Truck className="h-4 w-4" />
            Vendors ({vendors.length})
          </TabsTrigger>
          <TabsTrigger value="tenants" className="gap-2">
            <Users className="h-4 w-4" />
            Tenants ({tenants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors">
          {vendors.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="No vendors"
              description="Add vendors to this property to track their COI compliance."
              actionLabel="Add Vendor"
              onAction={() => navigate('/vendors/add')}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendors.map((vendor) => (
                      <TableRow
                        key={vendor.id}
                        className="cursor-pointer"
                        onClick={() => navigate('/vendors')}
                      >
                        <TableCell className="font-medium">{vendor.name}</TableCell>
                        <TableCell>
                          <StatusBadge status={vendor.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {vendor.expiration_date ? formatDate(vendor.expiration_date) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tenants">
          {tenants.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No tenants"
              description="Add tenants to this property to track their lease compliance."
              actionLabel="Add Tenant"
              onAction={() => navigate('/tenants/add')}
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenants.map((tenant) => (
                      <TableRow
                        key={tenant.id}
                        className="cursor-pointer"
                        onClick={() => navigate('/tenants')}
                      >
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell>
                          <StatusBadge status={tenant.insurance_status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tenant.expiration_date ? formatDate(tenant.expiration_date) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
