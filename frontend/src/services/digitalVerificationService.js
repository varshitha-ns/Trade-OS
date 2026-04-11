// TradeOS Digital Verification Service
// Handles API calls to government portals and databases

class DigitalVerificationService {
  constructor() {
    this.apiEndpoints = {
      // Government APIs
      mca: 'https://www.mca.gov.in/mca21/',
      gst: 'https://www.gst.gov.in/',
      dgft: 'https://dgft.gov.in/',
      customs: 'https://www.icegate.gov.in/',
      incomeTax: 'https://www.incometaxindiaefiling.gov.in/',
      uidai: 'https://uidai.gov.in/',
      
      // Banking APIs
      bankApi: 'https://api.bankindia.org/',
      ifscApi: 'https://ifsc.razorpay.com/',
      
      // Verification APIs
      panVerification: 'https://www.incometaxindiaefiling.gov.in/portal/pan/',
      aadhaarVerification: 'https://eaadhaar.uidai.gov.in/',
      
      // Quality Verification
      isoVerification: 'https://www.iaf.nl.in/',
      accreditationBodies: 'https://www.nabl.gov.in/'
    };

    this.apiKeys = {
      mca: process.env.REACT_APP_MCA_API_KEY,
      gst: process.env.REACT_APP_GST_API_KEY,
      dgft: process.env.REACT_APP_DGFT_API_KEY,
      customs: process.env.REACT_APP_CUSTOMS_API_KEY,
      bank: process.env.REACT_APP_BANK_API_KEY
    };
  }

  /**
   * MCA (Ministry of Corporate Affairs) Verification
   */
  async verifyWithMCA(cinNumber, companyName) {
    try {
      const response = await this.makeAPICall('mca', {
        endpoint: 'company/lookup',
        method: 'POST',
        data: {
          cin: cinNumber,
          company_name: companyName
        }
      });

      const verification = {
        isValid: response.status === 'ACTIVE',
        confidence: 95,
        details: {
          companyName: response.company_name,
          incorporationDate: response.incorporation_date,
          registeredAddress: response.registered_address,
          directorDetails: response.directors,
          status: response.status,
          authorizedCapital: response.authorized_capital
        },
        message: response.status === 'ACTIVE' ? 
          'Company verified with MCA database' : 
          'Company status check failed'
      };

      return verification;

    } catch (error) {
      console.error('MCA verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * GST Portal Verification
   */
  async verifyGSTIN(gstin, legalName) {
    try {
      const response = await this.makeAPICall('gst', {
        endpoint: 'gstin/search',
        method: 'POST',
        data: {
          gstin: gstin,
          legal_name: legalName
        }
      });

      const verification = {
        isValid: response.status === 'Active',
        confidence: 92,
        details: {
          legalName: response.legal_name,
          tradeName: response.trade_name,
          constitution: response.constitution,
          address: response.address,
          registrationDate: response.registration_date,
          turnover: response.turnover
        },
        message: response.status === 'Active' ? 
          'GSTIN verified with GST portal' : 
          'GSTIN status check failed'
      };

      return verification;

    } catch (error) {
      console.error('GST verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * DGFT (Directorate General of Foreign Trade) Verification
   */
  async verifyIEC(iecCode, firmName) {
    try {
      const response = await this.makeAPICall('dgft', {
        endpoint: 'iec/verify',
        method: 'POST',
        data: {
          iec_code: iecCode,
          firm_name: firmName
        }
      });

      const verification = {
        isValid: response.status === 'VALID',
        confidence: 88,
        details: {
          iecCode: response.iec_code,
          firmName: response.firm_name,
          address: response.address,
          issueDate: response.issue_date,
          validityDate: response.validity_date,
          exportItems: response.export_items
        },
        message: response.status === 'VALID' ? 
          'IEC code verified with DGFT' : 
          'IEC verification failed'
      };

      return verification;

    } catch (error) {
      console.error('IEC verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Customs EORI Verification
   */
  async verifyEORI(eoriNumber, entityName) {
    try {
      const response = await this.makeAPICall('customs', {
        endpoint: 'eori/verify',
        method: 'POST',
        data: {
          eori_number: eoriNumber,
          entity_name: entityName
        }
      });

      const verification = {
        isValid: response.status === 'ACTIVE',
        confidence: 90,
        details: {
          eoriNumber: response.eori_number,
          entityName: response.entity_name,
          country: response.country,
          registrationDate: response.registration_date
        },
        message: response.status === 'ACTIVE' ? 
          'EORI verified with customs' : 
          'EORI verification failed'
      };

      return verification;

    } catch (error) {
      console.error('EORI verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * PAN Card Verification
   */
  async verifyPAN(panNumber, name) {
    try {
      const response = await this.makeAPICall('incomeTax', {
        endpoint: 'pan/verify',
        method: 'POST',
        data: {
          pan_number: panNumber,
          name: name
        }
      });

      const verification = {
        isValid: response.status === 'VALID',
        confidence: 95,
        details: {
          panNumber: response.pan_number,
          name: response.name,
          dateOfBirth: response.date_of_birth,
          status: response.status
        },
        message: response.status === 'VALID' ? 
          'PAN verified with Income Tax Department' : 
          'PAN verification failed'
      };

      return verification;

    } catch (error) {
      console.error('PAN verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Aadhaar Verification (Limited API)
   */
  async verifyAadhaar(aadhaarNumber, name) {
    try {
      // Note: Full Aadhaar verification requires OTP consent
      // This is a limited verification for format and basic checks
      const response = await this.makeAPICall('uidai', {
        endpoint: 'aadhaar/verify/basic',
        method: 'POST',
        data: {
          aadhaar_number: aadhaarNumber,
          name: name
        }
      });

      const verification = {
        isValid: response.exists && response.name_match,
        confidence: 85,
        details: {
          exists: response.exists,
          nameMatch: response.name_match,
          maskedAadhaar: response.masked_aadhaar
        },
        message: response.exists && response.name_match ? 
          'Aadhaar basic verification passed' : 
          'Aadhaar verification failed'
      };

      return verification;

    } catch (error) {
      console.error('Aadhaar verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * IFSC Code Verification
   */
  async verifyIFSC(ifscCode) {
    try {
      const response = await fetch(`${this.apiEndpoints.ifscApi}${ifscCode}`);
      const data = await response.json();

      const verification = {
        isValid: data && data.BANK && data.BRANCH,
        confidence: 90,
        details: {
          bankName: data.BANK,
          branchName: data.BRANCH,
          address: data.ADDRESS,
          city: data.CITY,
          district: data.DISTRICT,
          state: data.STATE,
          phone: data.PHONE,
          micr: data.MICR
        },
        message: data && data.BANK ? 
          'IFSC code verified' : 
          'Invalid IFSC code'
      };

      return verification;

    } catch (error) {
      console.error('IFSC verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Bank Account Verification
   */
  async verifyBankAccount(accountNumber, ifscCode, accountHolderName) {
    try {
      const response = await this.makeAPICall('bank', {
        endpoint: 'account/verify',
        method: 'POST',
        data: {
          account_number: accountNumber,
          ifsc_code: ifscCode,
          account_holder_name: accountHolderName
        }
      });

      const verification = {
        isValid: response.account_exists && response.name_match,
        confidence: 85,
        details: {
          accountExists: response.account_exists,
          nameMatch: response.name_match,
          accountType: response.account_type,
          bankName: response.bank_name,
          branchName: response.branch_name
        },
        message: response.account_exists && response.name_match ? 
          'Bank account verified' : 
          'Bank account verification failed'
      };

      return verification;

    } catch (error) {
      console.error('Bank account verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * ISO Certificate Verification
   */
  async verifyISOCertificate(certificateNumber, companyName) {
    try {
      const response = await this.makeAPICall('isoVerification', {
        endpoint: 'certificate/verify',
        method: 'POST',
        data: {
          certificate_number: certificateNumber,
          company_name: companyName
        }
      });

      const verification = {
        isValid: response.status === 'VALID',
        confidence: 85,
        details: {
          certificateNumber: response.certificate_number,
          companyName: response.company_name,
          standard: response.standard,
          scope: response.scope,
          issueDate: response.issue_date,
          expiryDate: response.expiry_date,
          accreditationBody: response.accreditation_body
        },
        message: response.status === 'VALID' ? 
          'ISO certificate verified' : 
          'ISO certificate verification failed'
      };

      return verification;

    } catch (error) {
      console.error('ISO verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Land Record Verification (Agricultural Documents)
   */
  async verifyLandRecord(khataNumber, village, district) {
    try {
      const response = await this.makeAPICall('landRecords', {
        endpoint: 'land/verify',
        method: 'POST',
        data: {
          khata_number: khataNumber,
          village: village,
          district: district
        }
      });

      const verification = {
        isValid: response.record_exists,
        confidence: 80,
        details: {
          recordExists: response.record_exists,
          ownerName: response.owner_name,
          landArea: response.land_area,
          surveyNumber: response.survey_number,
          location: response.location
        },
        message: response.record_exists ? 
          'Land record verified' : 
          'Land record not found'
      };

      return verification;

    } catch (error) {
      console.error('Land record verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Import License Verification
   */
  async verifyImportLicense(licenseNumber, importerName) {
    try {
      const response = await this.makeAPICall('dgft', {
        endpoint: 'import-license/verify',
        method: 'POST',
        data: {
          license_number: licenseNumber,
          importer_name: importerName
        }
      });

      const verification = {
        isValid: response.status === 'VALID',
        confidence: 88,
        details: {
          licenseNumber: response.license_number,
          importerName: response.importer_name,
          validItems: response.valid_items,
          issueDate: response.issue_date,
          validityPeriod: response.validity_period
        },
        message: response.status === 'VALID' ? 
          'Import license verified' : 
          'Import license verification failed'
      };

      return verification;

    } catch (error) {
      console.error('Import license verification failed:', error);
      return { isValid: false, confidence: 0, error: error.message };
    }
  }

  /**
   * Generic API call handler
   */
  async makeAPICall(service, options) {
    // For development, simulate API responses (no API key required)
    if (process.env.NODE_ENV === 'development') {
      return this.simulateAPIResponse(service, options.data);
    }

    const apiKey = this.apiKeys[service];
    
    if (!apiKey && service !== 'ifsc') {
      throw new Error(`API key not configured for ${service} service`);
    }

    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey
      }
    };

    if (options.data) {
      config.body = JSON.stringify(options.data);
    }

    const response = await fetch(`${this.apiEndpoints[service]}${options.endpoint}`, config);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Simulate API responses for development
   */
  simulateAPIResponse(service, data) {
    const mockResponses = {
      mca: {
        status: 'ACTIVE',
        company_name: data.company_name || 'SAMPLE COMPANY LIMITED',
        incorporation_date: '2015-01-15',
        registered_address: '123 Business Street, Mumbai, Maharashtra',
        directors: ['John Doe', 'Jane Smith'],
        authorized_capital: '1000000'
      },
      gst: {
        status: 'Active',
        legal_name: data.legal_name || 'SAMPLE COMPANY LIMITED',
        trade_name: 'SAMPLE TRADERS',
        constitution: 'Private Limited Company',
        address: '123 Business Street, Mumbai, Maharashtra',
        registration_date: '2017-07-01',
        turnover: '50000000'
      },
      dgft: {
        status: 'VALID',
        iec_code: data.iec_code || '1234567890',
        firm_name: data.firm_name || 'SAMPLE EXPORTERS',
        address: '456 Export Avenue, Delhi',
        issue_date: '2018-03-20',
        validity_date: '2028-03-19'
      },
      customs: {
        status: 'ACTIVE',
        eori_number: data.eori_number || 'IN123456789',
        entity_name: data.entity_name || 'SAMPLE IMPORTERS',
        country: 'IN',
        registration_date: '2019-05-15'
      },
      incomeTax: {
        status: 'VALID',
        pan_number: data.pan_number || 'ABCDE1234F',
        name: data.name || 'John Doe',
        date_of_birth: '1985-01-15'
      },
      uidai: {
        exists: true,
        name_match: true,
        masked_aadhaar: 'XXXXXX7890'
      },
      bank: {
        account_exists: true,
        name_match: true,
        account_type: 'Current Account',
        bank_name: 'State Bank of India',
        branch_name: 'Main Branch'
      },
      isoVerification: {
        status: 'VALID',
        certificate_number: data.certificate_number || 'ISO123456',
        company_name: data.company_name || 'SAMPLE COMPANY LIMITED',
        standard: 'ISO 9001:2015',
        scope: 'Manufacturing and Export',
        issue_date: '2020-01-01',
        expiry_date: '2023-01-01',
        accreditation_body: 'NABL'
      },
      landRecords: {
        record_exists: true,
        owner_name: 'John Farmer',
        land_area: '2.5 hectares',
        survey_number: '123/456',
        location: 'Sample Village'
      }
    };

    return mockResponses[service] || { status: 'ERROR', message: 'Service not available' };
  }

  /**
   * Batch verification for multiple documents
   */
  async batchVerification(verifications) {
    const results = [];
    
    for (const verification of verifications) {
      try {
        const result = await this.performVerification(verification.type, verification.data);
        results.push({
          id: verification.id,
          type: verification.type,
          result,
          status: 'success'
        });
      } catch (error) {
        results.push({
          id: verification.id,
          type: verification.type,
          error: error.message,
          status: 'error'
        });
      }
    }
    
    return results;
  }

  /**
   * Perform verification based on type
   */
  async performVerification(type, data) {
    const verificationMethods = {
      'mca': () => this.verifyWithMCA(data.cinNumber, data.companyName),
      'gst': () => this.verifyGSTIN(data.gstin, data.legalName),
      'iec': () => this.verifyIEC(data.iecCode, data.firmName),
      'eori': () => this.verifyEORI(data.eoriNumber, data.entityName),
      'pan': () => this.verifyPAN(data.panNumber, data.name),
      'aadhaar': () => this.verifyAadhaar(data.aadhaarNumber, data.name),
      'ifsc': () => this.verifyIFSC(data.ifscCode),
      'bankAccount': () => this.verifyBankAccount(data.accountNumber, data.ifscCode, data.accountHolderName),
      'iso': () => this.verifyISOCertificate(data.certificateNumber, data.companyName),
      'landRecord': () => this.verifyLandRecord(data.khataNumber, data.village, data.district),
      'importLicense': () => this.verifyImportLicense(data.licenseNumber, data.importerName)
    };

    const method = verificationMethods[type];
    if (!method) {
      throw new Error(`Verification type ${type} not supported`);
    }

    return await method();
  }
}

// Export singleton instance
export const digitalVerificationService = new DigitalVerificationService();
export default digitalVerificationService;
