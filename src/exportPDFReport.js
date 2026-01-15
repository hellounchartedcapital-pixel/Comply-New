// PDF Report Export using HTML and browser print API
// This approach doesn't require external dependencies

export function exportPDFReport(vendors, userInfo = {}) {
  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (typeof amount === 'string') return amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate statistics
  const stats = {
    total: vendors.length,
    compliant: vendors.filter(v => v.status === 'compliant').length,
    expired: vendors.filter(v => v.status === 'expired').length,
    expiring: vendors.filter(v => v.status === 'expiring').length,
    nonCompliant: vendors.filter(v => v.status === 'non-compliant').length
  };

  const complianceRate = stats.total > 0
    ? Math.round((stats.compliant / stats.total) * 100)
    : 0;

  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Generate HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>SmartCOI Compliance Report</title>
      <style>
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page-break {
            page-break-before: always;
          }
          .no-break {
            page-break-inside: avoid;
          }
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #1f2937;
          background: white;
        }

        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 30px 40px;
          margin-bottom: 30px;
        }

        .header h1 {
          font-size: 32pt;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .header .subtitle {
          font-size: 16pt;
          opacity: 0.95;
        }

        .header-info {
          text-align: right;
          font-size: 10pt;
          margin-top: -50px;
        }

        .container {
          padding: 0 40px 40px;
        }

        .section-title {
          font-size: 18pt;
          font-weight: bold;
          color: #10b981;
          margin: 25px 0 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #10b981;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin: 20px 0;
        }

        .stat-box {
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          color: white;
        }

        .stat-box.blue { background: #3b82f6; }
        .stat-box.green { background: #10b981; }
        .stat-box.red { background: #ef4444; }
        .stat-box.orange { background: #f97316; }

        .stat-box .value {
          font-size: 28pt;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .stat-box .label {
          font-size: 11pt;
          opacity: 0.9;
        }

        .compliance-bar-container {
          margin: 15px 0;
        }

        .compliance-bar {
          height: 30px;
          background: #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .compliance-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          display: flex;
          align-items: center;
          padding-left: 15px;
          color: white;
          font-weight: bold;
          font-size: 12pt;
        }

        .compliance-label {
          font-size: 13pt;
          font-weight: 600;
          margin-bottom: 8px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 10pt;
        }

        table thead {
          background: #10b981;
          color: white;
        }

        table th {
          padding: 12px 10px;
          text-align: left;
          font-weight: bold;
        }

        table td {
          padding: 10px;
          border-bottom: 1px solid #e5e7eb;
        }

        table tbody tr:nth-child(even) {
          background: #f9fafb;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 9pt;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-compliant {
          background: #d1fae5;
          color: #065f46;
        }

        .status-expired {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-expiring {
          background: #fef3c7;
          color: #92400e;
        }

        .status-non-compliant {
          background: #ffedd5;
          color: #9a3412;
        }

        .issue-item {
          padding: 15px;
          background: #fef2f2;
          border-left: 4px solid #ef4444;
          margin: 10px 0;
          border-radius: 4px;
        }

        .issue-vendor {
          font-weight: bold;
          color: #991b1b;
          margin-bottom: 8px;
          font-size: 11pt;
        }

        .issue-message {
          color: #4b5563;
          font-size: 10pt;
          margin-left: 10px;
        }

        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 9pt;
          color: #9ca3af;
        }

        .text-center {
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>SmartCOI</h1>
        <div class="subtitle">Compliance Report</div>
        <div class="header-info">
          <div>Generated: ${reportDate}</div>
          ${userInfo.email ? `<div>For: ${userInfo.email}</div>` : ''}
        </div>
      </div>

      <div class="container">
        <div class="section-title">Executive Summary</div>

        <div class="stats-grid">
          <div class="stat-box blue">
            <div class="value">${stats.total}</div>
            <div class="label">Total Vendors</div>
          </div>
          <div class="stat-box green">
            <div class="value">${stats.compliant}</div>
            <div class="label">Compliant</div>
          </div>
          <div class="stat-box red">
            <div class="value">${stats.expired}</div>
            <div class="label">Expired</div>
          </div>
          <div class="stat-box orange">
            <div class="value">${stats.expired + stats.nonCompliant + stats.expiring}</div>
            <div class="label">Total Issues</div>
          </div>
        </div>

        <div class="compliance-bar-container">
          <div class="compliance-label">Overall Compliance Rate: ${complianceRate}%</div>
          <div class="compliance-bar">
            <div class="compliance-bar-fill" style="width: ${complianceRate}%">
              ${complianceRate}%
            </div>
          </div>
        </div>

        <div class="section-title">Vendor Details</div>

        <table class="no-break">
          <thead>
            <tr>
              <th>Vendor Name</th>
              <th>Status</th>
              <th>Expiration Date</th>
              <th>GL Coverage</th>
              <th>Auto Coverage</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            ${vendors.map(vendor => `
              <tr>
                <td>${vendor.name}</td>
                <td>
                  <span class="status-badge status-${vendor.status}">
                    ${vendor.status.replace('-', ' ')}
                  </span>
                </td>
                <td>${formatDate(vendor.expirationDate)}</td>
                <td>${formatCurrency(vendor.coverage.generalLiability.amount)}</td>
                <td>${formatCurrency(vendor.coverage.autoLiability.amount)}</td>
                <td class="text-center">${vendor.issues.length > 0 ? '⚠️' : '✓'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${vendors.filter(v => v.issues.length > 0).length > 0 ? `
          <div class="page-break"></div>
          <div class="section-title">Compliance Issues</div>

          ${vendors.filter(v => v.issues.length > 0).map(vendor => `
            <div class="issue-item no-break">
              <div class="issue-vendor">⚠️ ${vendor.name}</div>
              ${vendor.issues.map(issue => `
                <div class="issue-message">• ${issue.message}</div>
              `).join('')}
            </div>
          `).join('')}
        ` : ''}

        <div class="footer">
          <div>SmartCOI - Automated COI Tracking & Compliance</div>
          <div>This report was generated automatically on ${reportDate}</div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export the PDF report');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait for content to load, then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
}
