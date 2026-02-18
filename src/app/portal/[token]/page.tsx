import { createServiceClient } from '@/lib/supabase/service';
import { formatCurrency } from '@/lib/utils';
import { COVERAGE_LABELS, LIMIT_TYPE_LABELS } from '@/components/templates/template-labels';
import type { CoverageType, LimitType } from '@/types';
import { PortalUploadClient } from './portal-upload-client';

interface PortalPageProps {
  params: Promise<{ token: string }>;
}

interface CoverageRequirement {
  id: string;
  coverage_type: CoverageType;
  is_required: boolean;
  minimum_limit: number | null;
  limit_type: LimitType | null;
  requires_additional_insured: boolean;
  requires_waiver_of_subrogation: boolean;
}

interface PropertyEntity {
  id: string;
  entity_name: string;
  entity_address: string | null;
  entity_type: 'certificate_holder' | 'additional_insured';
}

interface ComplianceGap {
  gap_description: string;
  status: string;
}

interface EntityComplianceGap {
  match_details: string | null;
  status: string;
  property_entity: {
    entity_name: string;
    entity_type: string;
  }[] | null;
}

export default async function PortalPage({ params }: PortalPageProps) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Look up the portal token
  const { data: tokenRecord, error: tokenError } = await supabase
    .from('upload_portal_tokens')
    .select('id, vendor_id, tenant_id, token, expires_at, is_active')
    .eq('token', token)
    .single();

  // Token not found or inactive
  if (tokenError || !tokenRecord || !tokenRecord.is_active) {
    return <PortalErrorPage message="This upload link is no longer active. Please contact your property manager for a new link." />;
  }

  // Token expired
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return <PortalErrorPage message="This upload link has expired. Please contact your property manager for a new link." />;
  }

  const entityType = tokenRecord.vendor_id ? 'vendor' : 'tenant';
  const entityId = (tokenRecord.vendor_id ?? tokenRecord.tenant_id)!;

  // Fetch entity details
  const { data: entity } = await supabase
    .from(entityType === 'vendor' ? 'vendors' : 'tenants')
    .select('id, company_name, organization_id, property_id, template_id')
    .eq('id', entityId)
    .single();

  if (!entity) {
    return <PortalErrorPage message="This upload link is no longer active. Please contact your property manager for a new link." />;
  }

  // Fetch organization name
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', entity.organization_id)
    .single();

  // Fetch PM contact info
  const { data: pmUser } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('organization_id', entity.organization_id)
    .limit(1)
    .single();

  // Fetch property name
  let propertyName: string | null = null;
  if (entity.property_id) {
    const { data: property } = await supabase
      .from('properties')
      .select('name')
      .eq('id', entity.property_id)
      .single();
    propertyName = property?.name ?? null;
  }

  // Fetch coverage requirements from the template
  let coverageRequirements: CoverageRequirement[] = [];
  if (entity.template_id) {
    const { data: requirements } = await supabase
      .from('template_coverage_requirements')
      .select('id, coverage_type, is_required, minimum_limit, limit_type, requires_additional_insured, requires_waiver_of_subrogation')
      .eq('template_id', entity.template_id)
      .eq('is_required', true);
    coverageRequirements = (requirements ?? []) as CoverageRequirement[];
  }

  // Fetch property entities (additional insured, certificate holder)
  let propertyEntities: PropertyEntity[] = [];
  if (entity.property_id) {
    const { data: entities } = await supabase
      .from('property_entities')
      .select('id, entity_name, entity_address, entity_type')
      .eq('property_id', entity.property_id);
    propertyEntities = (entities ?? []) as PropertyEntity[];
  }

  // Fetch compliance gaps and expiration from the most recent confirmed certificate
  let complianceGaps: string[] = [];
  let earliestExpiredDate: string | null = null;
  const { data: latestCert } = await supabase
    .from('certificates')
    .select('id')
    .eq(entityType === 'vendor' ? 'vendor_id' : 'tenant_id', entityId)
    .in('processing_status', ['extracted', 'review_confirmed'])
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();

  if (latestCert) {
    // Check for expired coverages
    const { data: expiredCovs } = await supabase
      .from('extracted_coverages')
      .select('expiration_date')
      .eq('certificate_id', latestCert.id)
      .not('expiration_date', 'is', null)
      .order('expiration_date', { ascending: true });

    if (expiredCovs) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      for (const c of expiredCovs) {
        if (c.expiration_date && new Date(c.expiration_date + 'T00:00:00') < now) {
          earliestExpiredDate = c.expiration_date;
          break;
        }
      }
    }

    // Get coverage compliance gaps
    const { data: gaps } = await supabase
      .from('compliance_results')
      .select('gap_description, status')
      .eq('certificate_id', latestCert.id)
      .in('status', ['not_met', 'missing']);

    if (gaps && gaps.length > 0) {
      complianceGaps = (gaps as ComplianceGap[])
        .filter((g) => g.gap_description)
        .map((g) => g.gap_description);
    }

    // Get entity compliance gaps
    const { data: entityGaps } = await supabase
      .from('entity_compliance_results')
      .select('match_details, status, property_entity:property_entities(entity_name, entity_type)')
      .eq('certificate_id', latestCert.id)
      .in('status', ['missing', 'partial_match']);

    if (entityGaps && entityGaps.length > 0) {
      for (const eg of entityGaps as EntityComplianceGap[]) {
        const pe = eg.property_entity?.[0];
        if (pe) {
          const label = pe.entity_type === 'additional_insured' ? 'Additional Insured' : 'Certificate Holder';
          complianceGaps.push(`Missing ${label}: ${pe.entity_name}`);
        }
      }
    }
  }

  const additionalInsured = propertyEntities.filter((e) => e.entity_type === 'additional_insured');
  const certificateHolder = propertyEntities.find((e) => e.entity_type === 'certificate_holder');
  const pmName = pmUser?.full_name ?? 'your property manager';
  const organizationName = org?.name ?? 'Your Property Manager';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">SmartCOI</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Certificate of Insurance Upload
          </h1>
          <p className="text-base text-gray-500">
            Requested by <span className="font-medium text-gray-700">{organizationName}</span>
            {propertyName && (
              <> for <span className="font-medium text-gray-700">{propertyName}</span></>
            )}
          </p>
        </div>

        {/* Expired certificate alert — shown above everything */}
        {earliestExpiredDate && (
          <section className="bg-red-50 rounded-xl border-2 border-red-300 p-5 sm:p-6 mb-6">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 flex-shrink-0 text-red-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div>
                <h2 className="text-lg font-semibold text-red-800">Certificate Expired</h2>
                <p className="mt-1 text-sm text-red-700">
                  Your previous certificate expired on <span className="font-medium">{earliestExpiredDate}</span>.
                  Please upload a current certificate of insurance.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Requirements Section */}
        {(coverageRequirements.length > 0 || additionalInsured.length > 0 || certificateHolder) && (
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
              </svg>
              Insurance Requirements
            </h2>

            {coverageRequirements.length > 0 && (
              <div className="space-y-2 mb-5">
                {coverageRequirements.map((req) => (
                  <div key={req.id} className="flex items-start gap-2 py-1.5">
                    <svg className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{COVERAGE_LABELS[req.coverage_type]}</span>
                      {req.minimum_limit != null && req.limit_type && (
                        <>: minimum {formatCurrency(req.minimum_limit)} {LIMIT_TYPE_LABELS[req.limit_type].toLowerCase()}</>
                      )}
                      {req.limit_type === 'statutory' && <>: Statutory limits</>}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {additionalInsured.length > 0 && (
              <div className="border-t border-gray-100 pt-4 mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Your certificate must name the following as Additional Insured:
                </p>
                <div className="space-y-2 pl-1">
                  {additionalInsured.map((ai) => (
                    <div key={ai.id} className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">{ai.entity_name}</span>
                      {ai.entity_address && (
                        <span className="block text-gray-500 text-xs mt-0.5">{ai.entity_address}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {certificateHolder && (
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Certificate Holder should be:
                </p>
                <div className="text-sm text-gray-600 pl-1">
                  <span className="font-medium text-gray-700">{certificateHolder.entity_name}</span>
                  {certificateHolder.entity_address && (
                    <span className="block text-gray-500 text-xs mt-0.5">{certificateHolder.entity_address}</span>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Gaps Section */}
        {complianceGaps.length > 0 && (
          <section className="bg-red-50 rounded-xl border border-red-200 p-5 sm:p-6 mb-6">
            <h2 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
              <svg className="h-5 w-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Issues with Previous Certificate
            </h2>
            <ul className="space-y-2">
              {complianceGaps.map((gap, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {gap}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Upload Section */}
        <PortalUploadClient token={token} pmName={pmName} />

        {/* Footer */}
        <div className="mt-12 text-center text-xs text-gray-400 pb-8">
          <p>Powered by SmartCOI</p>
          {pmUser?.email && (
            <p className="mt-1">
              Questions? Contact{' '}
              <a href={`mailto:${pmUser.email}`} className="text-emerald-600 hover:text-emerald-700 underline">
                {pmName}
              </a>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

function PortalErrorPage({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4" />
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">SmartCOI</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 sm:p-10 max-w-md w-full text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Upload Link Unavailable</h1>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>
      </main>
    </div>
  );
}
