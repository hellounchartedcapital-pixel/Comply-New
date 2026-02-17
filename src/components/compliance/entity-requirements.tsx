import type { PropertyEntity, EntityComplianceResult } from '@/types';

function EntityStatusIcon({ status }: { status: 'found' | 'missing' | 'partial_match' | null }) {
  if (status === 'found') {
    return (
      <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  if (status === 'missing') {
    return (
      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    );
  }
  if (status === 'partial_match') {
    return (
      <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    );
  }
  // No certificate — show dash
  return (
    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
    </svg>
  );
}

interface EntityRequirementsProps {
  entities: PropertyEntity[];
  entityResults: EntityComplianceResult[];
  hasCertificate: boolean;
}

export function EntityRequirements({
  entities,
  entityResults,
  hasCertificate,
}: EntityRequirementsProps) {
  if (entities.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-foreground">Entity Requirements</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No entity requirements configured for this property.
        </p>
      </div>
    );
  }

  const certHolders = entities.filter((e) => e.entity_type === 'certificate_holder');
  const additionalInsured = entities.filter((e) => e.entity_type === 'additional_insured');

  function renderEntity(entity: PropertyEntity) {
    const result = entityResults.find((r) => r.property_entity_id === entity.id);
    const status = hasCertificate ? (result?.status ?? 'missing') : null;

    return (
      <div key={entity.id} className="flex items-start gap-3 py-2">
        <div className="mt-0.5">
          <EntityStatusIcon status={status} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{entity.entity_name}</p>
          {entity.entity_address && (
            <p className="text-xs text-muted-foreground">{entity.entity_address}</p>
          )}
          {result?.status === 'partial_match' && result.match_details && (
            <p className="mt-0.5 text-xs text-amber-600">{result.match_details}</p>
          )}
          {hasCertificate && !result && (
            <p className="mt-0.5 text-xs text-red-500">Not found on certificate</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-foreground">Entity Requirements</h3>

      {!hasCertificate && (
        <p className="mt-2 text-xs text-muted-foreground">
          Upload a COI to verify entity compliance.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {certHolders.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Certificate Holder
            </p>
            <div className="divide-y divide-slate-100">
              {certHolders.map(renderEntity)}
            </div>
          </div>
        )}
        {additionalInsured.length > 0 && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Additional Insured
            </p>
            <div className="divide-y divide-slate-100">
              {additionalInsured.map(renderEntity)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
