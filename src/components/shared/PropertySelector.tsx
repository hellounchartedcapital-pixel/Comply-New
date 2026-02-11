import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchProperties } from '@/services/properties';

interface PropertySelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  id?: string;
  className?: string;
}

export function PropertySelector({
  value,
  onChange,
  label = 'Assign to Property',
  required = false,
  error,
  id = 'property-select',
  className,
}: PropertySelectorProps) {
  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  });

  return (
    <div className={className}>
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id}>
            <SelectValue placeholder={isLoading ? 'Loading properties...' : 'Select a property'} />
          </SelectTrigger>
          <SelectContent>
            {(properties ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.address ? ` — ${p.address}` : ''}
              </SelectItem>
            ))}
            {(!properties || properties.length === 0) && !isLoading && (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">
                No properties found. Create a property first.
              </div>
            )}
          </SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
