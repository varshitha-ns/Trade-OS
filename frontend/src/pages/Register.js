import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verificationAPI } from '../services/api';
import { FiArrowRight, FiCheck, FiUser, FiMail, FiLock, FiUpload, FiChevronRight } from 'react-icons/fi';

const Register = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    company_name: '',
    user_type: 'exporter',
    country: '',
    business_registration_number: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    tax_id: ''
  });
  
  const steps = [
    { id: 1, name: 'Account Information', status: 'current' },
    { id: 2, name: 'Business Details', status: 'upcoming' },
    { id: 3, name: 'Documents', status: 'upcoming' },
    { id: 4, name: 'Review & Submit', status: 'upcoming' }
  ];
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState([]);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...registerData } = formData;

    try {
      const result = await register(registerData);

      if (result.success) {
        // Move to verification document upload step
        setVerificationStep(true);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadDocuments = async (e) => {
    e.preventDefault();
    if (!files.length) return;

    setUploading(true);
    setError('');

    try {
      await verificationAPI.uploadDocuments(files);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError('Failed to upload documents. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="text-green-600 text-6xl mb-4">
              
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Registration & Documents Submitted!</h3>
            <p className="text-gray-600 mb-4">
              Your account is pending verification. You will be able to access the marketplace once approved.
            </p>
            <p className="text-sm text-gray-500">Redirecting to login page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationStep) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <h2 className="text-2xl font-extrabold text-gray-900 text-center">
              Upload Verification Documents
            </h2>
            <p className="mt-2 text-sm text-gray-600 text-center">
              To keep the marketplace secure, we need to verify your business details.
            </p>

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleUploadDocuments}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documents
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-900 border border-gray-300 rounded-md cursor-pointer focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Upload business registration, tax ID, and owner ID documents.
                </p>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Selected files:</p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    {files.map((file, index) => (
                      <li key={index} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded">
                        <span className="truncate mr-2">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-xs text-red-500 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !files.length}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Submit Documents'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left side - Purple Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-indigo-700 to-purple-800 p-12 flex-col justify-between">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <span className="text-indigo-700 font-bold text-xl">T</span>
          </div>
          <span className="ml-3 text-white text-xl font-semibold">TradeOS</span>
        </div>
        
        <div className="mt-16">
          <h2 className="text-4xl font-bold text-white">Create your account</h2>
          <p className="mt-2 text-indigo-100">
            Join our platform to access global trade opportunities
          </p>
          
          {/* Progress Steps */}
          <nav aria-label="Progress" className="mt-12">
            <ol className="space-y-6">
              {steps.map((step) => (
                <li key={step.id} className="flex items-center">
                  {step.id < currentStep ? (
                    <>
                      <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-full">
                        <FiCheck className="h-5 w-5 text-white" />
                      </div>
                      <span className="ml-3 text-sm font-medium text-white">{step.name}</span>
                    </>
                  ) : step.id === currentStep ? (
                    <>
                      <div className="flex items-center justify-center w-8 h-8 bg-white border-2 border-indigo-600 rounded-full">
                        <span className="text-indigo-600 font-medium">{step.id}</span>
                      </div>
                      <span className="ml-3 text-sm font-medium text-white">{step.name}</span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-center w-8 h-8 border-2 border-gray-300 rounded-full">
                        <span className="text-gray-300 font-medium">{step.id}</span>
                      </div>
                      <span className="ml-3 text-sm font-medium text-gray-300">{step.name}</span>
                    </>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        </div>
        
        <div className="mt-auto">
          <p className="text-sm text-indigo-200">2025 TradeOS. All rights reserved.</p>
        </div>
      </div>

      {/* Right side - Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-12">
        <div className="w-full max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Business Details</h1>
            <p className="mt-1 text-sm text-gray-500">Please provide your business information</p>
          </div>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-2">
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiUser className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="company_name"
                      name="company_name"
                      type="text"
                      required
                      value={formData.company_name}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                      placeholder="Enter your company name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="col-span-2">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Business Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="address"
                    name="address"
                    type="text"
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="123 Business St"
                  />
                </div>

                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="New York"
                  />
                </div>

                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1.5">
                    State/Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    required
                    value={formData.state}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="NY"
                  />
                </div>

                <div>
                  <label htmlFor="zip_code" className="block text-sm font-medium text-gray-700 mb-1.5">
                    ZIP/Postal Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="zip_code"
                    name="zip_code"
                    type="text"
                    required
                    value={formData.zip_code}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="10001"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="country"
                    name="country"
                    required
                    value={formData.country}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="UK">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="IN">India</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label htmlFor="tax_id" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tax ID / EIN <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="tax_id"
                    name="tax_id"
                    type="text"
                    required
                    value={formData.tax_id}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full px-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="12-3456789"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {['Manufacturer', 'Wholesaler', 'Retailer', 'Distributor', 'Service Provider', 'Other'].map((type) => (
                      <div key={type} className="flex items-center">
                        <input
                          id={`business-type-${type.toLowerCase()}`}
                          name="business_type"
                          type="radio"
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                        />
                        <label htmlFor={`business-type-${type.toLowerCase()}`} className="ml-2 block text-sm text-gray-700">
                          {type}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Create Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="Create a password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => {}}
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg placeholder-gray-400 text-sm"
                    placeholder="Confirm your password"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      onClick={() => {}}
                    >
                      <FiEye className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                    required
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700">
                    I agree to the <a href="#" className="text-indigo-600 hover:text-indigo-500">Terms of Service</a> and{' '}
                    <a href="#" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</a>
                  </label>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                  <FiArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
          <div className="mt-6 text-center text-sm">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Sign in
              </Link>
            </p>
            <p className="mt-1 text-xs text-gray-500">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;