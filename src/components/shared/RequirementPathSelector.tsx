import { Building2, Brain, Edit3, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconContainer } from './IconContainer';
import type { EntityType } from '@/types';
import { cn } from '@/lib/utils';

type PathType = 'building_default' | 'ai_assisted' | 'manual';

interface PathOption {
  id: PathType;
  title: string;
  description: string;
  icon: LucideIcon;
  cta: string;
}

interface RequirementPathSelectorProps {
  entityType: EntityType;
  onSelect: (path: PathType) => void;
  hasBuildingDefaults?: boolean;
  className?: string;
}

export function RequirementPathSelector({
  entityType,
  onSelect,
  hasBuildingDefaults = false,
  className,
}: RequirementPathSelectorProps) {
  const paths: PathOption[] = [
    {
      id: 'building_default',
      title: 'Accept Building Defaults',
      description: hasBuildingDefaults
        ? `Use the pre-configured insurance requirements for this building's ${entityType}s.`
        : `No building defaults configured yet. Set them up in building settings first.`,
      icon: Building2,
      cta: 'Use Defaults',
    },
    {
      id: 'ai_assisted',
      title: 'AI-Assisted Setup',
      description:
        entityType === 'tenant'
          ? 'Upload a lease document and let AI extract the insurance requirements automatically.'
          : "Upload the vendor's existing COI and use AI to pre-fill the requirement form.",
      icon: Brain,
      cta: entityType === 'tenant' ? 'Upload Lease' : 'Upload COI',
    },
    {
      id: 'manual',
      title: 'Manual Entry',
      description: `Manually enter the insurance requirements for this ${entityType} using the form.`,
      icon: Edit3,
      cta: 'Enter Manually',
    },
  ];

  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {paths.map((path) => {
        const isDisabled = path.id === 'building_default' && !hasBuildingDefaults;

        return (
          <Card
            key={path.id}
            className={cn(
              'transition-shadow',
              isDisabled ? 'opacity-60' : 'hover:shadow-md cursor-pointer'
            )}
          >
            <CardContent className="flex flex-col items-center p-6 text-center">
              <IconContainer icon={path.icon} size="lg" />
              <h3 className="mt-4 text-base font-semibold">{path.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{path.description}</p>
              <Button
                className="mt-4 w-full"
                variant={path.id === 'ai_assisted' ? 'default' : 'outline'}
                disabled={isDisabled}
                onClick={() => onSelect(path.id)}
              >
                {path.cta}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export type { PathType };
