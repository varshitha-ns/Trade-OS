import React from 'react';
import { FiChevronRight } from 'react-icons/fi';

const BusinessDetailsStep = ({ formData, setFormData, prevStep, nextStep }) => {
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getRequiredDocuments = () => {
    const { role, businessType } = formData;
    const docs = [];

    // Common docs for all
    docs.push({ name: 'Government ID', description: 'Passport / National ID / Aadhaar of the authorized signatory', required: true });
    docs.push({ name: 'Bank Proof', description: 'Cancelled cheque or bank statement showing account name', required: true });

    if (role === 'exporter') {
      if (businessType === 'individual_farmer' || businessType === 'sole_proprietor') {
        docs.push({ name: 'Tax ID (PAN/TIN)', description: 'Tax registration number', required: true });
        docs.push({ name: 'IEC (Import-Export Code)', description: 'Export license number', required: true });
        docs.push({ name: 'Proof of Business Existence', description: 'Local municipal/collection center letter or Udyam/MSME certificate', required: false });
        docs.push({ name: 'Quality/Lab Test Certificate', description: 'Lab test for pesticide residues, moisture, etc.', required: true });
        docs.push({ name: 'Phytosanitary Certificate', description: 'Required by many importing countries', required: true });
      } else if (businessType === 'msme' || businessType === 'company') {
        docs.push({ name: 'Certificate of Incorporation / Registration', description: 'Legal entity registration document', required: true });
        docs.push({ name: 'Tax/VAT/GST Certificate', description: 'Tax registration certificate', required: true });
        docs.push({ name: 'Proof of Address', description: 'Company utility bill or address proof', required: true });
        docs.push({ name: 'Director ID', description: 'ID of the authorized signatory/director', required: true });
        docs.push({ name: 'UBO Declaration', description: 'Beneficial owners >25%', required: true });
        docs.push({ name: 'IEC (Export License)', description: 'Export license number', required: true });
      }
    } else if (role === 'importer') {
      if (businessType === 'company') {
        docs.push({ name: 'Certificate of Incorporation', description: 'Legal entity registration document', required: true });
        docs.push({ name: 'Tax ID', description: 'Tax registration number', required: true });
        docs.push({ name: 'Proof of Address', description: 'Company utility bill or address proof', required: true });
        docs.push({ name: 'Authorized Signatory ID', description: 'ID of the authorized signatory', required: true });
      } else if (businessType === 'sole_proprietor' || businessType === 'msme') {
        docs.push({ name: 'Business Trade License', description: 'Merchant or trade license', required: true });
        docs.push({ name: 'Tax ID', description: 'Tax registration number', required: true });
      }
      docs.push({ name: 'Bank Account Proof', description: 'For settlement purposes', required: true });
    }

    return docs;
  };

  const requiredDocs = getRequiredDocuments();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Business Details</h3>
        <p className="text-sm text-gray-600">Tell us about your business to get started.</p>
      </div>
      
      <form className="space-y-5">
        <div className="grid grid-cols-1 gap-5">
          <div>
            <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1.5">
              Business/Trade Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="businessName"
              id="businessName"
              value={formData.businessName || ''}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700 mb-1.5">
              Registration/Company Number
            </label>
            <input
              type="text"
              name="registrationNumber"
              id="registrationNumber"
              value={formData.registrationNumber || ''}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-1.5">
              Tax ID (PAN/VAT/GST/TIN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="taxId"
              id="taxId"
              value={formData.taxId || ''}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              required
            />
          </div>
          
          {formData.role === 'exporter' && (
            <div>
              <label htmlFor="iec" className="block text-sm font-medium text-gray-700 mb-1.5">
                IEC / Export License Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="iec"
                id="iec"
                value={formData.iec || ''}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                required
              />
              <p className="mt-1.5 text-xs text-gray-500">Don't have an IEC? We can help you get one.</p>
            </div>
          )}
          
          <div>
            <label htmlFor="primaryProducts" className="block text-sm font-medium text-gray-700 mb-1.5">
              Primary Product(s) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="primaryProducts"
              id="primaryProducts"
              value={formData.primaryProducts || ''}
              onChange={handleChange}
              placeholder="e.g., Turmeric, Fresh Turmeric Powder"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              required
            />
          </div>
          
          <div>
            <label htmlFor="monthlyVolume" className="block text-sm font-medium text-gray-700 mb-1.5">
              Estimated Monthly Volume <span className="text-red-500">*</span>
            </label>
            <select
              name="monthlyVolume"
              id="monthlyVolume"
              value={formData.monthlyVolume || ''}
              onChange={handleChange}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white"
              required
            >
              <option value="">Select monthly volume</option>
              <option value="0-100">0 - 100 units</option>
              <option value="101-500">101 - 500 units</option>
              <option value="501-1000">501 - 1,000 units</option>
              <option value="1000+">1,000+ units</option>
            </select>
          </div>
        </div>
      </form>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Required Documents</h3>
            <p className="text-xs text-blue-700 mt-1">You'll need to upload these documents in the next step.</p>
            
            <ul className="mt-3 space-y-2">
              {requiredDocs.map((doc, index) => (
                <li key={index} className="flex items-start">
                  <div className={`flex-shrink-0 mt-0.5 ${doc.required ? 'text-blue-500' : 'text-gray-400'}`}>
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-2">
                    <p className="text-xs font-medium text-gray-900">{doc.name} {!doc.required && <span className="text-gray-500 font-normal">(optional)</span>}</p>
                    <p className="text-xs text-gray-600">{doc.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-between items-center">
        <button
          type="button"
          onClick={prevStep}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Back
        </button>
        <button
          type="button"
          onClick={nextStep}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue to Documents
          <FiChevronRight className="ml-2 h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BusinessDetailsStep;
