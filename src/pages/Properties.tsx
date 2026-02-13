import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Plus, MapPin, Users, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchFilter } from '@/components/shared/SearchFilter';
import { EmptyState } from '@/components/shared/EmptyState';
import { IconContainer } from '@/components/shared/IconContainer';
import { fetchProperties } from '@/services/properties';
import type { Property } from '@/types';

export default function Properties() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  const filtered = (properties ?? []).filter(
    (p: Property) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.address ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address_street ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address_city ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const formatAddress = (p: Property): string | null => {
    if (p.address) return p.address;
    const parts = [p.address_street, p.address_city, p.address_state, p.address_zip].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Properties" subtitle="Manage your buildings and properties" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        subtitle="Manage your buildings and properties"
        actions={
          <Button onClick={() => navigate('/properties/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Property
          </Button>
        }
      />

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search properties..."
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start tracking vendor and tenant compliance."
          actionLabel="New Property"
          onAction={() => navigate('/properties/new')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((property: Property) => {
            const compliance = property.compliance_percentage ?? 0;
            const vendorCount = property.vendor_count ?? 0;
            const tenantCount = property.tenant_count ?? 0;
            const address = formatAddress(property);

            return (
              <Link
                key={property.id}
                to={`/properties/${property.id}`}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
              >
                <Card className="cursor-pointer hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <IconContainer icon={Building2} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{property.name}</h3>
                        {address && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{address}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Truck className="h-3.5 w-3.5 shrink-0" />
                        <span>{vendorCount} vendor{vendorCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        <span>{tenantCount} tenant{tenantCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t pt-3">
                      <span className="text-xs text-muted-foreground">Compliance</span>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              compliance >= 80
                                ? 'bg-emerald-500'
                                : compliance >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${compliance}%` }}
                          />
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            compliance >= 80
                              ? 'text-emerald-600'
                              : compliance >= 50
                                ? 'text-amber-600'
                                : 'text-red-600'
                          }`}
                        >
                          {compliance}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
