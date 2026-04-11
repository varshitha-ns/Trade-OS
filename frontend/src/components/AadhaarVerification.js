import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle, CheckCircle, XCircle, Clock, Shield, FileText, User, MapPin, Calendar } from 'lucide-react';
import AadhaarVerificationService from '../services/aadhaarVerificationService';

const AadhaarVerification = () => {
  const [file, setFile] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [serviceStatus, setServiceStatus] = useState(null);

  // Check service status on component mount
  React.useEffect(() => {
    checkServiceStatus();
  }, []);

  const checkServiceStatus = async () => {
    try {
      const status = await AadhaarVerificationService.getServiceStatus();
      setServiceStatus(status);
    } catch (err) {
      console.error('Failed to check service status:', err);
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile) => {
    setError('');
    setVerificationResult(null);
    
    // Validate file
    const validation = AadhaarVerificationService.validateFile(selectedFile);
    if (!validation.isValid) {
      setError(validation.errors.join(', '));
      return;
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('File warnings:', validation.warnings);
    }

    setFile(selectedFile);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleVerify = async () => {
    if (!file) return;

    setIsVerifying(true);
    setError('');

    try {
      const result = await AadhaarVerificationService.verifyAadhaar(file);
      const formattedResult = AadhaarVerificationService.formatVerificationResult(result);
      setVerificationResult(formattedResult);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setFile(null);
    setVerificationResult(null);
    setError('');
    setDragActive(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 95) return 'text-green-600';
    if (confidence >= 85) return 'text-blue-600';
    if (confidence >= 70) return 'text-yellow-600';
    if (confidence >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Aadhaar Card Verification</h1>
        <p className="text-gray-600">
          Secure verification using QR code and digital signature validation
        </p>
        {serviceStatus && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center">
              <Shield className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm text-green-800">
                Service Status: {serviceStatus.status} | Method: {serviceStatus.verificationMethod}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* File Upload Area */}
      {!verificationResult && (
        <div className="mb-8">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="aadhaar-file"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            
            <div className="space-y-4">
              <Upload className="mx-auto w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {file ? file.name : 'Drop your Aadhaar card here or click to browse'}
                </p>
                <p className="text-sm text-gray-500">
                  Supports PDF, JPG, JPEG, PNG (Max 10MB)
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {file && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? (
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </div>
                ) : (
                  'Verify Aadhaar'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Verification Results */}
      {verificationResult && (
        <div className="space-y-6">
          {/* Status Header */}
          <div className={`p-4 rounded-md border ${
            verificationResult?.status === 'success' ? 'bg-green-50 border-green-200' :
            verificationResult?.status === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getStatusIcon(verificationResult?.status)}
                <span className={`ml-2 font-medium ${
                  verificationResult?.status === 'success' ? 'text-green-800' :
                  verificationResult?.status === 'warning' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {verificationResult?.message}
                </span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium ${getConfidenceColor(verificationResult?.confidence)}`}>
                  Confidence: {verificationResult?.confidence}%
                </div>
                <div className="text-xs text-gray-500">
                  {AadhaarVerificationService.getConfidenceLevel(verificationResult?.confidence)}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          {verificationResult?.personalInfo && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" />
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600">Name</label>
                  <p className="mt-1 text-gray-800">{verificationResult?.personalInfo?.name || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Date of Birth</label>
                  <p className="mt-1 text-gray-800">
                    {verificationResult?.personalInfo?.dateOfBirth || 
                     verificationResult?.personalInfo?.yearOfBirth || 
                     'Not available'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Gender</label>
                  <p className="mt-1 text-gray-800">{verificationResult?.personalInfo?.gender || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600">Masked Aadhaar</label>
                  <p className="mt-1 text-gray-800 font-mono">{verificationResult?.maskedAadhaar || 'Not available'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {verificationResult?.address && (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                Address
              </h3>
              <p className="text-gray-800">{verificationResult?.address}</p>
            </div>
          )}

          {/* Verification Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Verification Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600">QR Code Found</label>
                <p className="mt-1">
                  {verificationResult?.verification?.qrCodeFound ? (
                    <span className="text-green-600">Yes</span>
                  ) : (
                    <span className="text-red-600">No</span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Format</label>
                <p className="mt-1 text-gray-800 capitalize">{verificationResult?.verification?.format || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Digital Signature</label>
                <p className="mt-1">
                  {verificationResult?.verification?.signatureVerified ? (
                    <span className="text-green-600">Verified</span>
                  ) : (
                    <span className="text-yellow-600">Not Verified</span>
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Processing Time</label>
                <p className="mt-1 text-gray-800">{verificationResult?.processingTime || 0}ms</p>
              </div>
            </div>
          </div>

          {/* Validation Errors/Warnings */}
          {verificationResult?.validation && (
            (verificationResult?.validation?.errors?.length > 0 || 
             verificationResult?.validation?.warnings?.length > 0) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Validation Messages
                </h3>
                {verificationResult?.validation?.errors?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                    <ul className="list-disc list-inside text-red-700">
                      {verificationResult.validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {verificationResult?.validation?.warnings?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
                    <ul className="list-disc list-inside text-yellow-700">
                      {verificationResult.validation.warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          )}

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={resetVerification}
              className="px-6 py-3 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Verify Another Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AadhaarVerification;
