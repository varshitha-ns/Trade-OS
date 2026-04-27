import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { FiUploadCloud, FiCheckCircle, FiClock, FiAlertCircle, FiFileText, FiArrowRight } from 'react-icons/fi';

const KYCUpload = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState({});
  const [error, setError] = useState('');

  // Role-based documents
  const documentTypes = user?.role === 'exporter' || user?.user_type === 'exporter'
    ? [
        { id: 'BUSINESS_REGISTRATION', label: 'Business Registration Certificate', icon: <FiFileText /> },
        { id: 'EXPORT_LICENSE', label: 'Export License', icon: <FiFileText /> },
        { id: 'QUALITY_CERT', label: 'Quality Certificate', icon: <FiFileText /> },
        { id: 'ADDRESS_PROOF', label: 'Address Proof', icon: <FiFileText /> }
      ]
    : [
        { id: 'BUSINESS_REGISTRATION', label: 'Business Registration Certificate', icon: <FiFileText /> },
        { id: 'IMPORT_LICENSE', label: 'Import License', icon: <FiFileText /> },
        { id: 'BANK_REFERENCE', label: 'Bank Reference Letter', icon: <FiFileText /> },
        { id: 'ADDRESS_PROOF', label: 'Address Proof', icon: <FiFileText /> }
      ];

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
  }, [user]);

  const fetchStatus = async () => {
    try {
      const response = await authAPI.getStatus(user.user_id || user.id);
      setStatus(response.data);

      // If backend says we are verified, refresh the global user state
      if (response.data.verification_status === 'VERIFIED' && user.verification_status !== 'VERIFIED') {
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to fetch status", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFileUpload = async (documentType, file) => {
    if (!file) return;
    
    setUploading(prev => ({ ...prev, [documentType]: true }));
    setError('');

    try {
      await authAPI.uploadKYC(user.user_id || user.id, documentType, file);
      await fetchStatus(); // Refresh status
    } catch (err) {
      setError(`Failed to upload ${documentType}. Please try again.`);
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const getDocStatus = (type) => {
    const doc = status?.kyc_documents?.find(d => d.type === type);
    return doc?.status || 'NOT_UPLOADED';
  };

  const handleGoToDashboard = async () => {
    // Final check/sync before redirecting to protected route
    await refreshUser();
    navigate('/dashboard');
  };

  if (loading) return <div className="flex justify-center p-20 text-indigo-600 font-bold">Loading Verification System...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-indigo-600 p-8 text-white flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold flex items-center">
                <FiCheckCircle className="mr-3" /> SME Verification
              </h1>
              <p className="mt-2 text-indigo-100 italic">
                Verification status: <span className="font-bold underline">{status?.verification_status || 'PENDING'}</span>
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-md"
            >
              Logout
            </button>
          </div>

          <div className="p-8">
            {error && (
              <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 text-red-700 flex items-center">
                <FiAlertCircle className="mr-2" /> {error}
              </div>
            )}

            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">Mandatory KYC Documents</h2>
                <p className="text-sm text-gray-500 mt-1">Please upload the following documents for your {user?.role || user?.user_type} profile.</p>
              </div>

              {documentTypes.map((doc) => (
                <div key={doc.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-200 hover:border-indigo-300 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                      {doc.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{doc.label}</h4>
                      <p className="text-xs text-gray-500 uppercase tracking-widest">{doc.id.replace('_', ' ')}</p>
                    </div>
                  </div>

                  <div className="mt-4 md:mt-0 flex items-center space-x-4">
                    <DocStatusBadge status={getDocStatus(doc.id)} />
                    
                    <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      uploading[doc.id] ? 'bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}>
                      {uploading[doc.id] ? 'Uploading...' : 'Upload'}
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload(doc.id, e.target.files[0])}
                        disabled={uploading[doc.id]}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Completion Section */}
            <div className="mt-10 p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-indigo-900">Finalize Onboarding</h3>
                <p className="text-sm text-indigo-700">Once all documents are uploaded, our AI will verify them within minutes.</p>
              </div>
              <button 
                onClick={handleGoToDashboard}
                disabled={status?.verification_status !== 'VERIFIED'}
                className="mt-4 md:mt-0 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400"
              >
                Go to Dashboard <FiArrowRight className="ml-2" />
              </button>
            </div>
            {status?.verification_status !== 'VERIFIED' && (
               <p className="text-xs text-center text-gray-400 mt-4 italic">The dashboard is locked until your status becomes VERIFIED.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DocStatusBadge = ({ status }) => {
  switch (status) {
    case 'VERIFIED':
      return <span className="flex items-center text-green-600 text-xs font-bold px-2 py-1 bg-green-100 rounded-full"><FiCheckCircle className="mr-1" /> VERIFIED</span>;
    case 'PENDING':
      return <span className="flex items-center text-amber-600 text-xs font-bold px-2 py-1 bg-amber-100 rounded-full"><FiClock className="mr-1" /> PENDING</span>;
    case 'REJECTED':
      return <span className="flex items-center text-red-600 text-xs font-bold px-2 py-1 bg-red-100 rounded-full"><FiAlertCircle className="mr-1" /> REJECTED</span>;
    default:
      return <span className="text-gray-400 text-xs font-bold px-2 py-1 bg-gray-100 rounded-full">NOT UPLOADED</span>;
  }
};

export default KYCUpload;
