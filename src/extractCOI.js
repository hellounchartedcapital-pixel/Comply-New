import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true // Required for client-side usage
});

/**
 * Extract text from PDF file
 * In production, you'd use a proper PDF parsing library
 * For now, we'll work with PDFs that can be read as text
 */
async function pdfToText(file) {
  // For demo purposes, we'll use a simple approach
  // In production, use pdf.js or a backend service
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // This is a simplified approach - real PDFs need proper parsing
        const text = e.target.result;
        resolve(text);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Extract COI data using Claude AI
 */
export async function extractCOIData(pdfFile) {
  try {
    console.log('Starting COI extraction...');
    
    // Step 1: Convert PDF to text (simplified for demo)
    // In production, you'd use pdf.js or send to backend
    const pdfText = await pdfToText(pdfFile);
    
    // Step 2: Send to Claude for extraction
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are an expert at extracting data from Certificate of Insurance (COI) documents.

Extract the following information from this COI document and return it as a JSON object:

{
  "companyName": "Full legal company name",
  "dba": "Doing Business As name (if any, otherwise null)",
  "expirationDate": "Earliest expiration date in YYYY-MM-DD format",
  "generalLiability": {
    "amount": number (e.g., 1000000 for $1M),
    "expirationDate": "YYYY-MM-DD"
  },
  "autoLiability": {
    "amount": number,
    "expirationDate": "YYYY-MM-DD"
  },
  "workersComp": {
    "amount": "Statutory" or number,
    "expirationDate": "YYYY-MM-DD"
  },
  "employersLiability": {
    "amount": number,
    "expirationDate": "YYYY-MM-DD"
  },
  "additionalInsured": "Names listed as additional insured (if any)",
  "certificateHolder": "Certificate holder name",
  "insuranceCompany": "Insurance company/carrier name"
}

Important rules:
- Extract amounts as pure numbers (e.g., 1000000 not "$1,000,000")
- Use YYYY-MM-DD format for all dates
- If a field is not found, use null
- For Workers Comp, if it says "Statutory" use that as a string, otherwise use the number
- The expirationDate at the top level should be the EARLIEST expiration date among all policies

Here is the COI document text:

${pdfText}

Return ONLY the JSON object, no other text.`
      }]
    });

    // Step 3: Parse Claude's response
    const responseText = message.content[0].text;
    console.log('Claude response:', responseText);
    
    // Extract JSON from response (Claude should return pure JSON)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }
    
    const extractedData = JSON.parse(jsonMatch[0]);
    
    // Step 4: Transform to vendor format
    const vendorData = {
      name: extractedData.companyName || 'Unknown Company',
      dba: extractedData.dba,
      expirationDate: extractedData.expirationDate || new Date().toISOString().split('T')[0],
      coverage: {
        generalLiability: {
          amount: extractedData.generalLiability?.amount || 0,
          compliant: (extractedData.generalLiability?.amount || 0) >= 1000000
        },
        autoLiability: {
          amount: extractedData.autoLiability?.amount || 0,
          compliant: (extractedData.autoLiability?.amount || 0) >= 1000000
        },
        workersComp: {
          amount: extractedData.workersComp?.amount || 'Statutory',
          compliant: true
        },
        employersLiability: {
          amount: extractedData.employersLiability?.amount || 0,
          compliant: (extractedData.employersLiability?.amount || 0) >= 500000
        }
      },
      rawData: extractedData
    };

    // Step 5: Calculate status and issues
    const issues = [];
    const today = new Date();
    const expirationDate = new Date(vendorData.expirationDate);
    const daysUntilExpiration = Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24));
    
    // Check expiration
    if (daysUntilExpiration < 0) {
      vendorData.status = 'expired';
      vendorData.daysOverdue = Math.abs(daysUntilExpiration);
      issues.push({
        type: 'critical',
        message: `All policies expired ${vendorData.expirationDate} (${vendorData.daysOverdue} days overdue)`
      });
    } else if (daysUntilExpiration <= 30) {
      vendorData.status = 'expiring';
      vendorData.daysOverdue = 0;
      issues.push({
        type: 'warning',
        message: `Policies expiring in ${daysUntilExpiration} days`
      });
    } else {
      vendorData.status = 'compliant';
      vendorData.daysOverdue = 0;
    }

    // Check coverage amounts
    if (!vendorData.coverage.generalLiability.compliant) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `General Liability below requirement: $${(vendorData.coverage.generalLiability.amount / 1000000).toFixed(1)}M (requires $1.0M)`
      });
    }

    if (!vendorData.coverage.autoLiability.compliant) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `Auto Liability below requirement: $${(vendorData.coverage.autoLiability.amount / 1000000).toFixed(1)}M (requires $1.0M)`
      });
    }

    if (!vendorData.coverage.employersLiability.compliant) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `Employers Liability below requirement: $${(vendorData.coverage.employersLiability.amount / 1000).toFixed(1)}K (requires $500K)`
      });
    }

    vendorData.issues = issues;

    console.log('Extracted vendor data:', vendorData);
    return { success: true, data: vendorData };

  } catch (error) {
    console.error('COI extraction error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to extract COI data'
    };
  }
}

/**
 * Extract COI data with file content as base64 (for actual PDF files)
 */
export async function extractCOIFromPDF(file, userRequirements = null) {
  try {
    console.log('Converting PDF to base64...');

    // Set default requirements if not provided
    const requirements = userRequirements || {
      general_liability: 1000000,
      auto_liability: 1000000,
      workers_comp: 'Statutory',
      employers_liability: 500000,
      custom_coverages: []
    };
    
    // Convert file to base64
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    console.log('Sending to Claude for extraction...');

    // Send PDF to Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Data
            }
          },
          {
            type: 'text',
            text: `You are an expert at extracting data from Certificate of Insurance (COI) documents.

Extract the following information from this COI PDF and return it as a JSON object:

{
  "companyName": "Full legal company name",
  "dba": "Doing Business As name (if any, otherwise null)",
  "expirationDate": "The EARLIEST policy expiration date among all coverages in YYYY-MM-DD format",
  "generalLiability": {
    "amount": number (e.g., 1000000 for $1M),
    "expirationDate": "YYYY-MM-DD"
  },
  "autoLiability": {
    "amount": number,
    "expirationDate": "YYYY-MM-DD"
  },
  "workersComp": {
    "amount": "Statutory" or number,
    "expirationDate": "YYYY-MM-DD"
  },
  "employersLiability": {
    "amount": number,
    "expirationDate": "YYYY-MM-DD"
  },
  "additionalCoverages": [
    {
      "type": "Cyber Liability" | "Professional Liability" | "Umbrella" | etc,
      "amount": number,
      "expirationDate": "YYYY-MM-DD"
    }
  ],
  "additionalInsured": "Names listed as additional insured (if any)",
  "certificateHolder": "Certificate holder name",
  "insuranceCompany": "Insurance company/carrier name"
}

CRITICAL INSTRUCTIONS FOR EXPIRATION DATES:
The COI document has a table with insurance policies that looks like this:

TYPE OF INSURANCE | POLICY NUMBER | POLICY EFF | POLICY EXP | LIMITS
GENERAL LIABILITY | ABC123       | 01/01/2026 | 01/01/2027 | $2,000,000
AUTOMOBILE       | XYZ456       | 01/01/2026 | 01/01/2027 | $2,000,000
WORKERS COMP     | DEF789       | 01/01/2026 | 01/01/2027 | Statutory

✓ CORRECT: Extract dates from the "POLICY EXP" column ONLY
  - For the example above, the expiration date is "01/01/2027" (NOT 01/01/2026)
  - POLICY EXP = when the policy expires (this is the furthest future date in each row)
  - This is typically the rightmost date in each policy row
  - Look for text "POLICY EXP" or "EXPIRATION" in the column header

✗ WRONG: Do NOT extract these dates:
  - Certificate date at the very top of the form (often labeled "DATE (MM/DD/YYYY)")
  - POLICY EFF dates (these are policy START dates, not expiration dates)
  - "THIS CERTIFICATE IS ISSUED AS OF" date
  - Revision date, description dates, certificate holder dates
  - ANY date that appears before the insurance table or outside it
  - The earlier date in a row is POLICY EFF (start), the later date is POLICY EXP (expiration)

Step-by-step extraction process:
1. Locate the insurance coverage table (has TYPE OF INSURANCE, POLICY EFF, POLICY EXP columns)
2. For GENERAL LIABILITY row: Find the date in the POLICY EXP column → extract that date
3. For AUTOMOBILE LIABILITY row: Find the date in the POLICY EXP column → extract that date
4. For WORKERS COMPENSATION row: Find the date in the POLICY EXP column → extract that date
5. For EMPLOYERS LIABILITY row: Find the date in the POLICY EXP column → extract that date
6. Convert all dates from MM/DD/YYYY to YYYY-MM-DD format
7. For top-level expirationDate: Return the EARLIEST date from ONLY the 4 main coverages (GL, Auto, WC, EL)
   - DO NOT include additional coverages (Crime, Cyber, Umbrella, etc.) in this calculation
   - Only compare the expiration dates from generalLiability, autoLiability, workersComp, employersLiability
   - Return the earliest date among those 4 main policies

REMEMBER: In each policy row, there are TWO dates - the earlier one is the start date (POLICY EFF), the later one is the expiration date (POLICY EXP). Always choose the LATER date from each row.

Other rules:
- Extract amounts as pure numbers (e.g., 1000000 not "$1,000,000")
- Use YYYY-MM-DD format for all dates
- If a field is not found, use null
- For Workers Comp, if it says "Statutory" use that as a string, otherwise use the number
- Look for ANY additional coverage types beyond the standard 4 (GL, Auto, WC, EL) and include them in additionalCoverages array
- Common additional coverages: Cyber Liability, Professional Liability/E&O, Umbrella/Excess, Pollution, Products Liability

Return ONLY the JSON object, no other text.`
          }
        ]
      }]
    });

    // Parse response
    const responseText = message.content[0].text;
    console.log('Claude response:', responseText);
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }
    
    const extractedData = JSON.parse(jsonMatch[0]);
    console.log('Extracted expiration date:', extractedData.expirationDate);
    console.log('All policy dates:', {
      GL: extractedData.generalLiability?.expirationDate,
      Auto: extractedData.autoLiability?.expirationDate,
      WC: extractedData.workersComp?.expirationDate,
      EL: extractedData.employersLiability?.expirationDate
    });

    // Transform to vendor format with user's requirements
    const vendorData = {
      name: extractedData.companyName || 'Unknown Company',
      dba: extractedData.dba,
      expirationDate: extractedData.expirationDate || new Date().toISOString().split('T')[0],
      coverage: {
        generalLiability: {
          amount: extractedData.generalLiability?.amount || 0,
          expirationDate: extractedData.generalLiability?.expirationDate,
          compliant: (extractedData.generalLiability?.amount || 0) >= requirements.general_liability
        },
        autoLiability: {
          amount: extractedData.autoLiability?.amount || 0,
          expirationDate: extractedData.autoLiability?.expirationDate,
          compliant: (extractedData.autoLiability?.amount || 0) >= requirements.auto_liability
        },
        workersComp: {
          amount: extractedData.workersComp?.amount || 'Statutory',
          expirationDate: extractedData.workersComp?.expirationDate,
          compliant: true // Workers comp is typically statutory, so usually compliant
        },
        employersLiability: {
          amount: extractedData.employersLiability?.amount || 0,
          expirationDate: extractedData.employersLiability?.expirationDate,
          compliant: (extractedData.employersLiability?.amount || 0) >= requirements.employers_liability
        }
      },
      // Store additional coverages from extraction
      additionalCoverages: extractedData.additionalCoverages || [],
      rawData: extractedData,
      requirements: requirements // Store requirements used for checking
    };

    // Calculate status and issues
    const issues = [];
    const today = new Date();
    const expirationDate = new Date(vendorData.expirationDate);
    const daysUntilExpiration = Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) {
      vendorData.status = 'expired';
      vendorData.daysOverdue = Math.abs(daysUntilExpiration);
      issues.push({
        type: 'critical',
        message: `All policies expired ${vendorData.expirationDate} (${vendorData.daysOverdue} days overdue)`
      });
    } else if (daysUntilExpiration <= 30) {
      vendorData.status = 'expiring';
      vendorData.daysOverdue = 0;
      issues.push({
        type: 'warning',
        message: `Policies expiring in ${daysUntilExpiration} days`
      });
    } else {
      vendorData.status = 'compliant';
      vendorData.daysOverdue = 0;
    }

    // Check if individual coverages are expired
    const checkCoverageExpiration = (coverage, name) => {
      if (coverage.expirationDate) {
        const expDate = new Date(coverage.expirationDate);
        const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
        if (daysUntil < 0) {
          coverage.expired = true;
        }
      }
    };

    checkCoverageExpiration(vendorData.coverage.generalLiability, 'General Liability');
    checkCoverageExpiration(vendorData.coverage.autoLiability, 'Auto Liability');
    checkCoverageExpiration(vendorData.coverage.workersComp, 'Workers Comp');
    checkCoverageExpiration(vendorData.coverage.employersLiability, 'Employers Liability');

    // Check additional coverage expirations
    if (vendorData.additionalCoverages) {
      vendorData.additionalCoverages.forEach(cov => {
        if (cov.expirationDate) {
          const expDate = new Date(cov.expirationDate);
          const daysUntil = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
          if (daysUntil < 0) {
            cov.expired = true;
          }
        }
      });
    }

    // Check standard coverage compliance
    if (!vendorData.coverage.generalLiability.compliant) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `General Liability below requirement: $${(vendorData.coverage.generalLiability.amount / 1000000).toFixed(1)}M (requires $${(requirements.general_liability / 1000000).toFixed(1)}M)`
      });
    }

    if (!vendorData.coverage.autoLiability.compliant) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `Auto Liability below requirement: $${(vendorData.coverage.autoLiability.amount / 1000000).toFixed(1)}M (requires $${(requirements.auto_liability / 1000000).toFixed(1)}M)`
      });
    }

    if (!vendorData.coverage.employersLiability.compliant) {
      vendorData.status = 'non-compliant';
      issues.push({
        type: 'error',
        message: `Employers Liability below requirement: $${(vendorData.coverage.employersLiability.amount / 1000).toFixed(1)}K (requires $${(requirements.employers_liability / 1000).toFixed(1)}K)`
      });
    }

    // Check custom coverage requirements
    if (requirements.custom_coverages && requirements.custom_coverages.length > 0) {
      requirements.custom_coverages.forEach(requiredCoverage => {
        if (!requiredCoverage.required) return; // Skip if not required

        // Find matching coverage in extracted data
        const foundCoverage = vendorData.additionalCoverages.find(
          cov => cov.type && cov.type.toLowerCase().includes(requiredCoverage.type.toLowerCase())
        );

        if (!foundCoverage) {
          // Required coverage not found
          vendorData.status = 'non-compliant';
          issues.push({
            type: 'error',
            message: `Missing required coverage: ${requiredCoverage.type}`
          });
        } else if (foundCoverage.amount < requiredCoverage.amount) {
          // Coverage found but amount is insufficient
          vendorData.status = 'non-compliant';
          issues.push({
            type: 'error',
            message: `${requiredCoverage.type} below requirement: $${(foundCoverage.amount / 1000000).toFixed(1)}M (requires $${(requiredCoverage.amount / 1000000).toFixed(1)}M)`
          });
        }
      });
    }

    vendorData.issues = issues;

    console.log('Extracted vendor data:', vendorData);
    return { success: true, data: vendorData };

  } catch (error) {
    console.error('PDF extraction error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to extract data from PDF'
    };
  }
}
