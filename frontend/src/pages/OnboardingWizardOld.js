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
  FiCalendar
} from 'react-icons/fi';
import '../styles/onboarding.css';

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

const OnboardingWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    company_name: 'Acme Inc',
    email: 'contact@acme.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business St',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    country: 'US',
    tax_id: '12-3456789',
    business_type: 'Manufacturer',
    website: 'www.acme.com',
    industry: 'Manufacturing',
    annual_revenue: '1M - 5M',
    employee_count: '11-50',
    established_year: '2015'
  });

  const steps = [
    { id: 1, name: 'Account', status: 'complete' },
    { id: 2, name: 'Business', status: 'current' },
    { id: 3, name: 'Documents', status: 'upcoming' },
    { id: 4, name: 'Review', status: 'upcoming' }
  ];

  const industries = [
    { value: 'Manufacturing', label: 'Manufacturing' },
    { value: 'Retail', label: 'Retail' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Healthcare', label: 'Healthcare' },
    { value: 'Finance', label: 'Finance' },
  ];

  const revenueRanges = [
    { value: '0-100K', label: '$0 - $100,000' },
    { value: '100K-500K', label: '$100,000 - $500,000' },
    { value: '500K-1M', label: '$500,000 - $1M' },
    { value: '1M-5M', label: '$1M - $5M' },
    { value: '5M+', label: '$5M+' },
  ];

  const employeeCounts = [
    { value: '1-10', label: '1-10' },
    { value: '11-50', label: '11-50' },
    { value: '51-200', label: '51-200' },
    { value: '201-500', label: '201-500' },
    { value: '501+', label: '501+' },
  ];

  const businessTypes = ['Manufacturer', 'Wholesaler', 'Retailer', 'Distributor', 'Service Provider', 'Other'];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    return (
      <div className="onboarding-card">
        {/* Progress Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex-1 flex flex-col items-center">
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
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Business Information</h3>
              <p className="mt-1 text-sm text-gray-500">
                Please provide your business details to complete your profile.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            {/* Company Name */}
            <div className="col-span-2">
              <InputField
                label="Company Name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                icon={FiBriefcase}
                required
              />
            </div>

            {/* Email */}
            <div>
              <InputField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                icon={FiMail}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <InputField
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                icon={FiPhone}
                required
              />
            </div>

            {/* Website */}
            <div className="col-span-2">
              <InputField
                label="Website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                icon={FiGlobe}
              />
            </div>

            {/* Address */}
            <div className="col-span-2">
              <InputField
                label="Business Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                icon={FiMapPin}
                required
              />
            </div>

            {/* City */}
            <div>
              <InputField
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>

            {/* State/Province */}
            <div>
              <InputField
                label="State/Province"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
              />
            </div>

            {/* ZIP/Postal Code */}
            <div>
              <InputField
                label="ZIP/Postal Code"
                name="zip_code"
                value={formData.zip_code}
                onChange={handleChange}
                required
              />
            </div>

            {/* Country */}
            <div>
              <SelectField
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                options={[
                  { value: 'US', label: 'United States' },
                  { value: 'CA', label: 'Canada' },
                  { value: 'UK', label: 'United Kingdom' },
                  { value: 'AU', label: 'Australia' },
                  { value: 'IN', label: 'India' },
                ]}
                required
              />
            </div>

            {/* Industry */}
            <div>
              <SelectField
                label="Industry"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                options={industries}
                required
              />
            </div>

            {/* Annual Revenue */}
            <div>
              <SelectField
                label="Annual Revenue"
                name="annual_revenue"
                value={formData.annual_revenue}
                onChange={handleChange}
                options={revenueRanges}
                required
              />
            </div>

            {/* Employee Count */}
            <div>
              <SelectField
                label="Employee Count"
                name="employee_count"
                value={formData.employee_count}
                onChange={handleChange}
                options={employeeCounts}
                required
              />
            </div>

            {/* Year Established */}
            <div>
              <InputField
                label="Year Established"
                name="established_year"
                type="number"
                value={formData.established_year}
                onChange={handleChange}
                min="1900"
                max={new Date().getFullYear()}
                required
              />
            </div>

            {/* Tax ID */}
            <div className="col-span-2">
              <InputField
                label="Tax ID / EIN"
                name="tax_id"
                value={formData.tax_id}
                onChange={handleChange}
                required
              />
            </div>

            {/* Business Type */}
            <div className="col-span-2">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {businessTypes.map((type) => (
                    <div key={type} className="flex items-center">
                      <input
                        id={`business-type-${type.toLowerCase()}`}
                        name="business_type"
                        type="radio"
                        checked={formData.business_type === type}
                        onChange={() => setFormData({...formData, business_type: type})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor={`business-type-${type.toLowerCase()}`} className="ml-2 block text-sm text-gray-700">
                        {type}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={prevStep}
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
                Continue
                <FiChevronRight className="ml-2 h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
        {renderStep()}
      </div>
    </div>
  );
};

export default OnboardingWizard;
