import React, { useState } from 'react';
import { 
  FiCheck, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiGlobe, 
  FiChevronRight, 
  FiChevronLeft, 
  FiBriefcase,
  FiDollarSign,
  FiUsers,
  FiCalendar,
  FiUpload,
  FiUser,
  FiFileText,
  FiShield,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiXCircle
} from 'react-icons/fi';
import '../styles/onboarding.css';
import '../styles/ocrUpload.css';
import OCRDocumentUpload from '../components/OCRDocumentUpload';

// Reusable Input Component
const InputField = ({ 
  label, 
  name, 
  type = 'text', 
  icon: Icon, 
  required = false, 
  value, 
  onChange, 
  className = '',
  containerClass = '',
  ...props 
}) => (
  <div className={`form-group ${containerClass}`}>
    <label className="form-label">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className={`form-input ${Icon ? 'pl-10' : 'pl-3'} ${className}`}
        required={required}
        {...props}
      />
    </div>
  </div>
);

// Reusable Select Component
const SelectField = ({ label, name, value, onChange, options, required = false, className = '', containerClass = '' }) => (
  <div className={`form-group ${containerClass}`}>
    <label className="form-label">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className={`form-input ${className}`}
      required={required}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Role Selection Component
const RoleSelection = ({ selectedRole, onChange }) => {
  const roles = [
    { 
      id: 'exporter', 
      title: 'Exporter', 
      description: 'Sell your products internationally',
      icon: '🌾',
      color: 'green'
    },
    { 
      id: 'importer', 
      title: 'Importer', 
      description: 'Buy products from international sellers',
      icon: '📦',
      color: 'blue'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {roles.map((role) => (
        <div
          key={role.id}
          onClick={() => onChange(role.id)}
          className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
        >
          <div className="role-icon">{role.icon}</div>
          <h3 className="role-title">{role.title}</h3>
          <p className="role-description">{role.description}</p>
        </div>
      ))}
    </div>
  );
};

// Business Type Selection Component
const BusinessTypeSelection = ({ selectedRole, selectedBusinessType, onChange }) => {
  const exporterTypes = [
    { id: 'farmer', title: 'Individual Farmer', icon: '🌾', description: 'Small-scale farmer selling directly' },
    { id: 'sole_proprietor', title: 'Sole Proprietor', icon: '👤', description: 'Single owner business' },
    { id: 'cooperative', title: 'Farmers\' Cooperative / FPO', icon: '🤝', description: 'Group of farmers working together' },
    { id: 'msme', title: 'MSME / SME', icon: '🏢', description: 'Small or Medium Enterprise' },
    { id: 'private_limited', title: 'Private Limited Company', icon: '🏛️', description: 'Registered private company' }
  ];

  const importerTypes = [
    { id: 'individual_trader', title: 'Individual Trader / Sole Proprietor', icon: '👤', description: 'Single trader business' },
    { id: 'wholesaler', title: 'Wholesaler / Retailer', icon: '🏪', description: 'Bulk buying and selling' },
    { id: 'msme', title: 'MSME / SME', icon: '🏢', description: 'Small or Medium Enterprise' },
    { id: 'private_limited', title: 'Private Limited Company', icon: '🏛️', description: 'Registered private company' }
  ];

  const types = selectedRole === 'exporter' ? exporterTypes : importerTypes;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {types.map((type) => (
        <div
          key={type.id}
          onClick={() => onChange(type.id)}
          className={`business-type-card ${selectedBusinessType === type.id ? 'selected' : ''}`}
        >
          <div className="business-type-icon">{type.icon}</div>
          <h4 className="business-type-title">{type.title}</h4>
          <p className="business-type-description">{type.description}</p>
        </div>
      ))}
    </div>
  );
};

// Document Upload Component
const DocumentUpload = ({ title, description, required = false, documents, onDocumentUpload }) => {
  return (
    <div className="document-upload">
      <FiUpload className="document-upload-icon" />
      <h4 className="document-upload-title">{title}</h4>
      <p className="document-upload-description">{description}</p>
      {required && <span className="text-red-500 text-sm">*Required</span>}
      
      <div className="mt-4">
        <button
          type="button"
          className="btn-primary"
          onClick={() => onDocumentUpload(title)}
        >
          Upload Document
        </button>
      </div>
      
      {documents && documents.length > 0 && (
        <div className="mt-4 space-y-2">
          {documents.map((doc, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm">{doc.name}</span>
              <FiCheckCircle className="h-4 w-4 text-green-500" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Verification Status Component
const VerificationStatus = ({ status, message }) => {
  const statusConfig = {
    verified: { icon: FiCheckCircle, text: 'Verified' },
    pending: { icon: FiClock, text: 'Pending' },
    rejected: { icon: FiXCircle, text: 'Rejected' },
    missing: { icon: FiAlertCircle, text: 'Missing Information' }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <div className={`verification-status ${status}`}>
      <Icon className="verification-status-icon" />
      <span className="verification-status-text">{config.text}</span>
      {message && <span className="verification-status-message">{message}</span>}
    </div>
  );
};

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [steps, setSteps] = useState([
    { id: 1, name: 'Role', status: 'current' },
    { id: 2, name: 'Business Type', status: 'upcoming' },
    { id: 3, name: 'Personal Info', status: 'upcoming' },
    { id: 4, name: 'Business Info', status: 'upcoming' },
    { id: 5, name: 'Documents', status: 'upcoming' },
    { id: 6, name: 'Compliance', status: 'upcoming' },
    { id: 7, name: 'Bank Verify', status: 'upcoming' },
    { id: 8, name: 'Review', status: 'upcoming' },
    { id: 9, name: 'Verification', status: 'upcoming' },
    { id: 10, name: 'Complete', status: 'upcoming' }
  ]);
  
  const [formData, setFormData] = useState({
    // Step 1: Role Selection
    role: '',
    
    // Step 2: Business Type
    businessType: '',
    
    // Step 3: Personal Information
    fullName: '',
    phoneNumber: '',
    email: '',
    country: '',
    state: '',
    district: '',
    village: '',
    preferredLanguage: '',
    businessDescription: '',
    
    // Step 4: Business Information (varies by type)
    companyName: '',
    panNumber: '',
    gstNumber: '',
    iecNumber: '',
    bankAccountNumber: '',
    bankName: '',
    ifscCode: '',
    
    // Document uploads
    uploadedDocuments: {},
    
    // Verification status
    verificationStatus: {}
  });

  const countries = [
    { value: 'IN', label: 'India' },
    { value: 'US', label: 'United States' },
    { value: 'UK', label: 'United Kingdom' },
    { value: 'AU', label: 'Australia' },
    { value: 'CA', label: 'Canada' }
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिन्दी (Hindi)' },
    { value: 'te', label: 'తెలుగు (Telugu)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'mr', label: 'मराठी (Marathi)' }
  ];

  const handleChange = (e) => {
    console.log('Field changed:', e.target.name, e.target.value); // Debug log
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleSelect = (role) => {
    console.log('Role selected:', role); // Debug log
    setFormData({ ...formData, role });
  };

  const handleBusinessTypeSelect = (type) => {
    console.log('Business type selected:', type); // Debug log
    setFormData({ ...formData, businessType: type });
  };

  const handleDocumentUpload = (docType) => {
    // Simulate document upload
    const newDoc = {
      name: `${docType}_${Date.now()}.pdf`,
      uploadDate: new Date(),
      status: 'uploaded'
    };
    
    setFormData({
      ...formData,
      uploadedDocuments: {
        ...formData.uploadedDocuments,
        [docType]: [...(formData.uploadedDocuments[docType] || []), newDoc]
      }
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      // Update step statuses
      const newSteps = steps.map((step, index) => {
        if (index + 1 === currentStep) {
          return { ...step, status: 'complete' };
        } else if (index + 1 === currentStep + 1) {
          return { ...step, status: 'current' };
        }
        return step;
      });
      setSteps(newSteps);
      
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getRequiredDocuments = () => {
    const { role, businessType } = formData;
    const documents = [];

    // Core Identity Verification (All Users)
    documents.push({
      title: 'Government ID',
      description: 'Passport, Aadhaar, Voter ID, or Driver\'s License',
      required: true,
      type: 'identity'
    });

    documents.push({
      title: 'Selfie/Liveness Check',
      description: 'Photo to verify your identity matches the ID',
      required: false,
      type: 'identity'
    });

    // Business Verification based on type
    if (businessType === 'farmer' && role === 'exporter') {
      documents.push({
        title: 'Bank Account Proof',
        description: 'Bank passbook first page, cancelled cheque, or bank statement',
        required: true,
        type: 'financial'
      });

      documents.push({
        title: 'IEC - Import Export Code',
        description: 'Mandatory for all exporters',
        required: true,
        type: 'export'
      });

      documents.push({
        title: 'Farmer Certificate',
        description: 'Farmer ID card, land ownership record (RTC/Patta), or cultivation certificate',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'FPO Membership (Optional)',
        description: 'If you\'re part of a Farmers\' Cooperative',
        required: false,
        type: 'business'
      });
    } else if (businessType === 'sole_proprietor') {
      documents.push({
        title: 'PAN / Tax ID',
        description: 'Permanent Account Number or Tax Identification Number',
        required: true,
        type: 'financial'
      });

      documents.push({
        title: 'Business Registration',
        description: 'Shop Act License, Udyam/MSME certificate, or local trade license',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'Bank Account Proof',
        description: 'Bank passbook first page, cancelled cheque, or bank statement',
        required: true,
        type: 'financial'
      });

      if (role === 'exporter') {
        documents.push({
          title: 'IEC - Import Export Code',
          description: 'Mandatory for all exporters',
          required: true,
          type: 'export'
        });
      }
    } else if (businessType === 'cooperative') {
      documents.push({
        title: 'Cooperative Registration Certificate',
        description: 'Official registration certificate of your FPO/cooperative',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'PAN / Tax ID',
        description: 'Permanent Account Number or Tax Identification Number',
        required: true,
        type: 'financial'
      });

      documents.push({
        title: 'Authorized Signatory ID',
        description: 'ID of President/Secretary or authorized signatory',
        required: true,
        type: 'identity'
      });

      documents.push({
        title: 'Board Resolution',
        description: 'Meeting resolution authorizing export/import activities',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'Bank Account Proof',
        description: 'FPO cooperative bank account details',
        required: true,
        type: 'financial'
      });

      if (role === 'exporter') {
        documents.push({
          title: 'IEC - Import Export Code',
          description: 'Mandatory for all exporters',
          required: true,
          type: 'export'
        });
      }
    } else if (businessType === 'msme' || businessType === 'private_limited') {
      documents.push({
        title: 'Certificate of Incorporation',
        description: 'Company incorporation certificate',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'Company PAN / Tax Registration',
        description: 'Company PAN card and tax registration details',
        required: true,
        type: 'financial'
      });

      documents.push({
        title: 'GST/VAT Certificate',
        description: 'Goods and Services Tax or VAT registration certificate',
        required: false,
        type: 'financial'
      });

      documents.push({
        title: 'Proof of Business Address',
        description: 'Utility bill, lease deed, or electricity bill',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'Authorized Signatory ID',
        description: 'ID of authorized signatory for the company',
        required: true,
        type: 'identity'
      });

      documents.push({
        title: 'Board Resolution',
        description: 'Board resolution authorizing trade activities',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'UBO Declaration',
        description: 'Ultimate Beneficial Owners declaration (>25% ownership)',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'Bank Account Proof',
        description: 'Company bank account details',
        required: true,
        type: 'financial'
      });

      if (role === 'exporter') {
        documents.push({
          title: 'IEC - Import Export Code',
          description: 'Mandatory for all exporters',
          required: true,
          type: 'export'
        });
      }

      if (role === 'importer') {
        documents.push({
          title: 'Import License',
          description: 'Import license (if required by your country)',
          required: false,
          type: 'import'
        });
      }
    }

    // Importer specific documents
    if (role === 'importer') {
      documents.push({
        title: 'Business Registration Certificate',
        description: 'Business registration or trade license',
        required: true,
        type: 'business'
      });

      documents.push({
        title: 'Tax/VAT Registration',
        description: 'Tax identification and VAT registration',
        required: true,
        type: 'financial'
      });

      documents.push({
        title: 'Bank Account Proof',
        description: 'Bank account details for payments',
        required: true,
        type: 'financial'
      });

      documents.push({
        title: 'EORI/EIN (Optional)',
        description: 'EORI (Europe) or EIN (USA) if applicable',
        required: false,
        type: 'import'
      });
    }

    // Optional documents that boost trust score
    documents.push({
      title: 'ISO Certification (Optional)',
      description: 'Quality management certifications if available',
      required: false,
      type: 'trust'
    });

    documents.push({
      title: 'Trade References (Optional)',
      description: 'Previous export/import invoices or trade references',
      required: false,
      type: 'trust'
    });

    return documents;
  };

  const getDocumentTypeMapping = (documentTitle) => {
    const mapping = {
      'Government ID': 'AADHAAR_CARD',
      'Selfie/Liveness Check': 'SELFIE',
      'PAN / Tax ID': 'PAN_CARD',
      'Bank Account Proof': 'BANK_PASSBOOK',
      'IEC - Import Export Code': 'IEC_CERTIFICATE',
      'Farmer Certificate': 'FARMER_CERTIFICATE',
      'Cooperative Registration Certificate': 'COOPERATIVE_CERTIFICATE',
      'Certificate of Incorporation': 'INCORPORATION_CERTIFICATE',
      'Company PAN / Tax Registration': 'PAN_CARD',
      'GST/VAT Certificate': 'GST_CERTIFICATE',
      'Proof of Business Address': 'ADDRESS_PROOF',
      'Authorized Signatory ID': 'AADHAAR_CARD',
      'Board Resolution': 'BOARD_RESOLUTION',
      'UBO Declaration': 'UBO_DECLARATION',
      'Business Registration': 'BUSINESS_REGISTRATION',
      'Import License': 'IMPORT_LICENSE',
      'EORI/EIN (Optional)': 'BUSINESS_REGISTRATION',
      'ISO Certification (Optional)': 'ISO_CERTIFICATE',
      'Trade References (Optional)': 'TRADE_REFERENCE',
      'FPO Membership (Optional)': 'FPO_MEMBERSHIP'
    };
    return mapping[documentTitle] || 'OTHER_DOCUMENT';
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to TradeOS</h2>
              <p className="text-gray-600">Let's get you started with international trade. First, tell us about your role.</p>
            </div>
            
            <RoleSelection 
              selectedRole={formData.role} 
              onChange={handleRoleSelect}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Business Type</h2>
              <p className="text-gray-600">How do you operate in the trade ecosystem?</p>
            </div>
            
            <BusinessTypeSelection 
              selectedRole={formData.role}
              selectedBusinessType={formData.businessType}
              onChange={handleBusinessTypeSelect}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Information</h2>
              <p className="text-gray-600">Tell us about yourself - this helps us verify your identity.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <InputField
                  label="Full Name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  icon={FiUser}
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <InputField
                  label="Phone Number"
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  icon={FiPhone}
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <InputField
                  label="Email Address"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  icon={FiMail}
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <SelectField
                  label="Preferred Language"
                  name="preferredLanguage"
                  value={formData.preferredLanguage}
                  onChange={handleChange}
                  options={languages}
                  required
                />
              </div>

              <div className="sm:col-span-6">
                <SelectField
                  label="Country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  options={countries}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <InputField
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <InputField
                  label="District"
                  name="district"
                  value={formData.district}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <InputField
                  label="Village/City"
                  name="village"
                  value={formData.village}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="sm:col-span-6">
                <div className="form-group">
                  <label className="form-label">Business Description (Optional)</label>
                  <textarea
                    name="businessDescription"
                    value={formData.businessDescription}
                    onChange={handleChange}
                    className="form-input"
                    rows={3}
                    placeholder="Tell us briefly about your business..."
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Business Information</h2>
              <p className="text-gray-600">
                {formData.businessType === 'farmer' 
                  ? "Let's collect your farm and business details."
                  : "Please provide your business registration details."
                }
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {formData.businessType !== 'farmer' && (
                <div className="sm:col-span-6">
                  <InputField
                    label="Company Name"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    icon={FiBriefcase}
                    required
                  />
                </div>
              )}

              <div className="sm:col-span-3">
                <InputField
                  label="PAN / Tax ID"
                  name="panNumber"
                  value={formData.panNumber}
                  onChange={handleChange}
                  required
                />
              </div>

              {(formData.businessType === 'msme' || formData.businessType === 'private_limited') && (
                <div className="sm:col-span-3">
                  <InputField
                    label="GST Number"
                    name="gstNumber"
                    value={formData.gstNumber}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div className="sm:col-span-3">
                <InputField
                  label="IEC Number"
                  name="iecNumber"
                  value={formData.iecNumber}
                  onChange={handleChange}
                  required={formData.role === 'exporter'}
                />
              </div>

              <div className="sm:col-span-3">
                <InputField
                  label="Bank Account Number"
                  name="bankAccountNumber"
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  icon={FiFileText}
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <InputField
                  label="Bank Name"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <InputField
                  label="IFSC Code"
                  name="ifscCode"
                  value={formData.ifscCode}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Document Upload with OCR</h2>
              <p className="text-gray-600">
                Upload your documents and our AI will automatically extract the information.
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  {formData.role === 'exporter' ? 'Exporter' : 'Importer'} - {formData.businessType?.replace('_', ' ').toUpperCase()}
                </h3>
                <p className="text-sm text-blue-800">
                  {formData.businessType === 'farmer' && formData.role === 'exporter' && 
                    "As an Individual Farmer Exporter, upload ID, bank proof, IEC, and farmer certificate."
                  }
                  {formData.businessType === 'sole_proprietor' && 
                    `As a Sole Proprietor ${formData.role}, upload ID, tax registration, business license, and bank details.`
                  }
                  {formData.businessType === 'cooperative' && 
                    `As a Cooperative ${formData.role}, upload registration, signatory ID, board resolution, and bank details.`
                  }
                  {(formData.businessType === 'msme' || formData.businessType === 'private_limited') && 
                    `As a ${formData.businessType.toUpperCase()} ${formData.role}, upload incorporation, tax registration, UBO, and bank details.`
                  }
                  {!formData.businessType && 
                    "Please complete the previous steps to see your required documents."
                  }
                </p>
              </div>
            </div>
            
            <div className="space-y-6">
              {getRequiredDocuments().map((doc, index) => {
                const documentType = getDocumentTypeMapping(doc.title);
                return (
                  <OCRDocumentUpload
                    key={index}
                    title={doc.title}
                    description={doc.description}
                    required={doc.required}
                    documentType={documentType}
                    onOCRComplete={(ocrResult, autoFillData) => {
                      console.log('OCR completed for', doc.title, ocrResult, autoFillData);
                      // Auto-fill form with high confidence data
                      setFormData(prev => ({
                        ...prev,
                        ...autoFillData
                      }));
                    }}
                    onFieldUpdate={(fieldData) => {
                      console.log('Field updated', fieldData);
                      setFormData(prev => ({
                        ...prev,
                        ...fieldData
                      }));
                    }}
                  />
                );
              })}
            </div>
            
            {getRequiredDocuments().length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Please select your role and business type to see required documents.</p>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Compliance Checklist</h2>
              <p className="text-gray-600">Export compliance requirements - upload before shipping</p>
            </div>
            
            <div className="space-y-4">
              <VerificationStatus 
                status="verified" 
                message="Lab test certificate uploaded" 
              />
              
              <VerificationStatus 
                status="pending" 
                message="Phytosanitary certificate pending" 
              />
              
              <VerificationStatus 
                status="verified" 
                message="Product photos complete" 
              />
              
              <VerificationStatus 
                status="missing" 
                message="Pesticide residue test report required" 
              />
            </div>
            
            <div className="mt-6">
              <button
                type="button"
                className="btn-primary"
                onClick={() => handleDocumentUpload('compliance_doc')}
              >
                Upload Compliance Documents
              </button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bank Verification</h2>
              <p className="text-gray-600">Verify your bank account to enable secure transactions.</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-900 mb-2">Choose Verification Method</h3>
              
              <div className="space-y-3">
                <label className="flex items-center">
                  <input type="radio" name="verification_method" className="mr-3" />
                  <div>
                    <div className="font-medium">Instant API Verification</div>
                    <div className="text-sm text-gray-600">Connect via banking partner (recommended)</div>
                  </div>
                </label>
                
                <label className="flex items-center">
                  <input type="radio" name="verification_method" className="mr-3" />
                  <div>
                    <div className="font-medium">Micro-deposit Verification</div>
                    <div className="text-sm text-gray-600">Receive small deposits to verify</div>
                  </div>
                </label>
                
                <label className="flex items-center">
                  <input type="radio" name="verification_method" className="mr-3" />
                  <div>
                    <div className="font-medium">Document Upload</div>
                    <div className="text-sm text-gray-600">Upload passbook or cancelled cheque</div>
                  </div>
                </label>
              </div>
              
              <div className="mt-4">
                <button type="button" className="btn-primary">
                  Start Verification
                </button>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Final Review</h2>
              <p className="text-gray-600">Please review all information before submission.</p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4">Application Summary</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700">Role & Business Type</h4>
                  <p className="text-sm text-gray-600">
                    {formData.role === 'exporter' ? 'Exporter' : 'Importer'} - {formData.businessType}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Personal Information</h4>
                  <p className="text-sm text-gray-600">{formData.fullName}</p>
                  <p className="text-sm text-gray-600">{formData.email}</p>
                  <p className="text-sm text-gray-600">{formData.phoneNumber}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Business Details</h4>
                  <p className="text-sm text-gray-600">PAN: {formData.panNumber}</p>
                  <p className="text-sm text-gray-600">IEC: {formData.iecNumber}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Bank Account</h4>
                  <p className="text-sm text-gray-600">{formData.bankName}</p>
                  <p className="text-sm text-gray-600">****{formData.bankAccountNumber.slice(-4)}</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-3">Document Status</h4>
                <div className="space-y-2">
                  <VerificationStatus status="verified" message="Government ID" />
                  <VerificationStatus status="verified" message="Bank Proof" />
                  <VerificationStatus status="pending" message="IEC Certificate" />
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Some documents can be uploaded later before your first export/import.
              </p>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification in Progress</h2>
              <p className="text-gray-600">Your documents are being reviewed. This typically takes 1-2 business days.</p>
            </div>
            
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <FiClock className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Under Review</h3>
              <p className="text-gray-600 mb-4">
                Our verification team is reviewing your documents. You'll receive an email once complete.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 text-left max-w-md mx-auto">
                <h4 className="font-medium mb-2">What happens next:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Automatic document validation</li>
                  <li>• Business registry verification</li>
                  <li>• Manual review by our experts</li>
                  <li>• Compliance and sanctions check</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <FiCheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to TradeOS!</h2>
              <p className="text-xl text-gray-600 mb-6">
                Your verification is complete. You're ready to start trading internationally.
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-green-900 mb-3">What you can do now:</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                  <div>
                    <div className="font-medium">📦 List Products</div>
                    <div className="text-sm text-gray-600">Start listing your products for international buyers</div>
                  </div>
                  <div>
                    <div className="font-medium">🤝 Find Buyers</div>
                    <div className="text-sm text-gray-600">Connect with verified buyers from around the world</div>
                  </div>
                  <div>
                    <div className="font-medium">📋 Manage Orders</div>
                    <div className="text-sm text-gray-600">Track and manage your export/import orders</div>
                  </div>
                </div>
              </div>
              
              <button type="button" className="btn-primary text-lg px-8 py-3">
                Go to Dashboard
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="onboarding-container">
      {/* Top Navigation */}
      <nav className="onboarding-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">T</span>
                </div>
                <span className="ml-2 text-gray-900 font-medium">TradeOS</span>
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="text-sm text-gray-500">
                Step {currentStep} of {steps.length}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="onboarding-content">
        <div className="onboarding-card">
          {/* Progress Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between overflow-x-auto">
              {steps.map((step, index) => (
                <div key={step.id} className="flex-1 flex flex-col items-center min-w-0">
                  <div className="step-indicator">
                    <div className={`step-number ${
                      step.status === 'complete'
                        ? 'bg-green-100 text-green-600'
                        : step.status === 'current'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {step.status === 'complete' ? (
                        <FiCheck className="w-4 h-4" />
                      ) : (
                        <span>{step.id}</span>
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`step-line ${
                        steps[index + 1].status === 'complete' || step.status === 'complete'
                          ? 'bg-green-100'
                          : 'bg-gray-200'
                      }`}></div>
                    )}
                  </div>
                  <span className={`step-label ${
                    step.status === 'current' ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Section */}
          <div className="onboarding-form">
            {renderStepContent()}
          </div>

          {/* Navigation Buttons */}
          {currentStep < 10 && currentStep !== 9 && (
            <div className="form-actions px-6 pb-6">
              <button
                type="button"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="btn-secondary"
              >
                <FiChevronLeft className="mr-2 h-5 w-5" />
                Back
              </button>
              <div className="space-x-3">
                <button
                  type="button"
                  className="btn-secondary"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="btn-primary"
                >
                  {currentStep === 8 ? 'Submit for Verification' : 'Continue'}
                  <FiChevronRight className="ml-2 h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
