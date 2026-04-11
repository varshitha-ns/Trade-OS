import React, { useState } from 'react';
import { onboardAPI } from '../services/api';

const FarmerOnboard = () => {
  const [step, setStep] = useState(1);
  const [onboardingId, setOnboardingId] = useState(null);
  const [missing, setMissing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [basicForm, setBasicForm] = useState({
    email: '',
    password: '',
    company_name: '',
    country: '',
    user_type: 'exporter',
  });

  const [filesByType, setFilesByType] = useState({
    id: [],
    bank_proof: [],
    iec: [],
    lab_report: [],
    phytosanitary: [],
  });

  const handleBasicChange = (e) => {
    setBasicForm({ ...basicForm, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await onboardAPI.register(basicForm);
      setOnboardingId(data.onboarding_id);
      setMissing(data.required_docs || []);
      setStep(2);
    } catch (err) {
      setError('Failed to start onboarding.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (type, e) => {
    const selected = Array.from(e.target.files || []);
    setFilesByType((prev) => ({ ...prev, [type]: [...prev[type], ...selected] }));
  };

  const uploadForType = async (type) => {
    if (!onboardingId || !filesByType[type].length) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await onboardAPI.uploadDocuments(onboardingId, type, filesByType[type]);
      setMissing(data.missing || []);
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatus = async () => {
    if (!onboardingId) return;
    try {
      const { data } = await onboardAPI.getStatus(onboardingId);
      setMissing(data.missing || []);
    } catch (err) {
      setError('Could not refresh status.');
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Exporting turmeric?</h1>
          <p className="text-sm text-gray-600 mb-4">
            We&apos;ll help you step-by-step. Start by telling us who you are.
          </p>
          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={basicForm.email}
                onChange={handleBasicChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                name="password"
                value={basicForm.password}
                onChange={handleBasicChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name / Farm / Company</label>
              <input
                type="text"
                name="company_name"
                value={basicForm.company_name}
                onChange={handleBasicChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Country</label>
              <input
                type="text"
                name="country"
                value={basicForm.country}
                onChange={handleBasicChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Starting...' : 'Start Onboarding'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900">Upload your documents</h1>
        <p className="text-sm text-gray-600 mb-4">
          First upload your identity and bank proof. If you don&apos;t have IEC yet, choose &quot;I need help&quot; in the future flow.
        </p>
        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {['id', 'bank_proof', 'iec', 'lab_report', 'phytosanitary'].map((type) => (
            <div key={type} className="border border-gray-200 rounded-md p-3">
              <h2 className="text-sm font-semibold capitalize mb-1">{type.replace('_', ' ')}</h2>
              <input
                type="file"
                multiple
                onChange={(e) => handleFileChange(type, e)}
                className="text-xs"
              />
              <button
                type="button"
                onClick={() => uploadForType(type)}
                disabled={loading || !filesByType[type].length}
                className="mt-2 inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                Upload {type}
              </button>
              <div className="mt-1 text-[11px] text-gray-500">
                {filesByType[type].length} file(s) selected
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3">
          <button
            type="button"
            onClick={fetchStatus}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            Refresh status
          </button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
          <div className="font-semibold mb-1">Missing items:</div>
          {missing && missing.length ? (
            <ul className="list-disc list-inside text-gray-700">
              {missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <div className="text-green-600">All required documents received. You can be verified for export.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FarmerOnboard;
