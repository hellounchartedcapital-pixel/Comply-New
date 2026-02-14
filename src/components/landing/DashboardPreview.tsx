/* -------------------------------------------------------------------------- */
/*  Static dashboard preview mockup for the landing page hero                  */
/* -------------------------------------------------------------------------- */

const sidebarItems = [
  { label: 'Dashboard', active: true },
  { label: 'Properties' },
  { label: 'Vendors' },
  { label: 'Tenants' },
  { label: 'Certificates' },
];

const statCards = [
  { label: 'Total Certs', value: '127', color: '#111114' },
  { label: 'Compliant', value: '98', color: '#73E2A7' },
  { label: 'Issues', value: '18', color: '#E5534B' },
  { label: 'Expiring Soon', value: '11', color: '#E5A500' },
];

const tableRows = [
  { name: 'Apex Plumbing Co.', property: 'Riverfront Plaza', expires: 'Mar 15, 2026', coverage: '$2M GL', status: 'Compliant', statusBg: 'rgba(115,226,167,0.15)', statusColor: '#5CC98E' },
  { name: 'Metro Electric LLC', property: 'Summit Tower', expires: 'Feb 28, 2026', coverage: '$1M GL', status: 'Expiring', statusBg: 'rgba(229,165,0,0.15)', statusColor: '#E5A500' },
  { name: 'Bright Bean Coffee', property: 'Riverfront Plaza', expires: 'Jun 01, 2026', coverage: '$500K GL', status: 'Non-Compliant', statusBg: 'rgba(229,83,75,0.12)', statusColor: '#E5534B' },
  { name: 'AllStar HVAC', property: 'Eastgate Office Park', expires: 'Sep 12, 2026', coverage: '$2M GL', status: 'Compliant', statusBg: 'rgba(115,226,167,0.15)', statusColor: '#5CC98E' },
];

/* Sidebar icon paths (simple stroke icons) */
function SidebarIcon({ index, active }: { index: number; active?: boolean }) {
  const color = active ? '#fff' : '#6B6B76';
  const paths: Record<number, JSX.Element> = {
    0: <><rect x="3" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none" /><rect x="14" y="3" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none" /><rect x="3" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none" /><rect x="14" y="14" width="7" height="7" rx="1" stroke={color} strokeWidth="1.5" fill="none" /></>,
    1: <><rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none" /><path d="M3 9h18M9 9v12" stroke={color} strokeWidth="1.5" /></>,
    2: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.5" fill="none" /><circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" stroke={color} strokeWidth="1.5" fill="none" /><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke={color} strokeWidth="1.5" fill="none" /></>,
    3: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={color} strokeWidth="1.5" fill="none" /><circle cx="9" cy="7" r="4" stroke={color} strokeWidth="1.5" fill="none" /></>,
    4: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" stroke={color} strokeWidth="1.5" fill="none" /><path d="M14 2v6h6" stroke={color} strokeWidth="1.5" /><path d="M9 15l2 2 4-4" stroke={color} strokeWidth="1.5" fill="none" /></>,
  };
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none">{paths[index]}</svg>;
}

export function DashboardPreview() {
  return (
    <div
      className="select-none pointer-events-none w-full"
      style={{ borderRadius: 16, boxShadow: '0 12px 48px rgba(0,0,0,0.07)', border: '1px solid #EBEBEF', overflow: 'hidden', background: '#fff' }}
      aria-hidden="true"
    >
      {/* macOS title bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: '#F8F9FB', borderBottom: '1px solid #EBEBEF' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E5534B' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#E5A500' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#73E2A7' }} />
      </div>

      {/* Body */}
      <div style={{ display: 'flex', minHeight: 280 }}>
        {/* Sidebar — hidden on mobile */}
        <div className="hidden md:flex" style={{ width: 48, background: '#111114', flexDirection: 'column', padding: '10px 6px', gap: 2, flexShrink: 0 }}>
          {sidebarItems.map((item, i) => (
            <div
              key={item.label}
              title={item.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 6, borderRadius: 6,
                background: item.active ? '#73E2A7' : 'transparent',
              }}
            >
              <SidebarIcon index={i} active={item.active} />
            </div>
          ))}
        </div>

        {/* Main */}
        <div style={{ flex: 1, padding: 14, background: '#F8F9FB', overflow: 'hidden' }}>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
            {statCards.map((c) => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #EBEBEF' }}>
                <div style={{ fontSize: 8, color: '#6B6B76', marginBottom: 2, fontFamily: "'DM Sans', sans-serif" }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.color, fontFamily: "'DM Sans', sans-serif" }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #EBEBEF', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'DM Sans', sans-serif" }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #EBEBEF' }}>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 8, fontWeight: 600, color: '#6B6B76' }}>Vendor / Tenant</th>
                  <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '6px 10px', fontSize: 8, fontWeight: 600, color: '#6B6B76' }}>Property</th>
                  <th className="hidden lg:table-cell" style={{ textAlign: 'left', padding: '6px 10px', fontSize: 8, fontWeight: 600, color: '#6B6B76' }}>Expires</th>
                  <th className="hidden sm:table-cell" style={{ textAlign: 'left', padding: '6px 10px', fontSize: 8, fontWeight: 600, color: '#6B6B76' }}>Coverage</th>
                  <th style={{ textAlign: 'left', padding: '6px 10px', fontSize: 8, fontWeight: 600, color: '#6B6B76' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: i < tableRows.length - 1 ? '1px solid #F0F0F4' : 'none' }}>
                    <td style={{ padding: '6px 10px', fontSize: 9, fontWeight: 500, color: '#111114' }}>{r.name}</td>
                    <td className="hidden sm:table-cell" style={{ padding: '6px 10px', fontSize: 9, color: '#6B6B76' }}>{r.property}</td>
                    <td className="hidden lg:table-cell" style={{ padding: '6px 10px', fontSize: 9, color: '#6B6B76' }}>{r.expires}</td>
                    <td className="hidden sm:table-cell" style={{ padding: '6px 10px', fontSize: 9, color: '#6B6B76' }}>{r.coverage}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{ display: 'inline-block', fontSize: 8, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: r.statusBg, color: r.statusColor }}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
