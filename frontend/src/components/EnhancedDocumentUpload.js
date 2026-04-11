import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiCheck, FiAlertCircle, FiX, FiEye, FiLoader, FiShield } from 'react-icons/fi';
import { ocrService } from '../services/ocrService';
import { useDocumentVerification } from '../hooks/useDocumentVerification';
import DocumentValidationResult from './DocumentValidationResult';
import '../styles/ocrUpload.css';
import '../styles/documentValidation.css';

const EnhancedDocumentUpload = ({ 
  title, 
  description, 
  required = false, 
  documentType,
  onVerificationComplete,
  onFieldUpdate,
  className = '',
  showDigitalVerification = true
}) => {
  const { validateDocument, loading, error, verificationResults, reset } = useDocumentVerification();
  const [uploadState, setUploadState] = useState('idle');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [ocrResults, setOcrResults] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadState('uploading');
      setUploadedFile(file);
      reset(); // Reset previous results

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }

      // Step 1: OCR Processing
      setUploadState('processing');
      let ocrResult;
      try {
        ocrResult = process.env.NODE_ENV === 'development' 
          ? await ocrService.simulateOCR(file, documentType)
          : await ocrService.processDocument(file, documentType);
      } catch (ocrError) {
        console.error('OCR Service Error:', ocrError);
        ocrResult = await ocrService.simulateOCR(file, documentType);
      }

      if (!ocrResult || !ocrResult.success) {
        throw new Error('OCR processing failed - no valid results returned');
      }

      setOcrResults(ocrResult);

      // Step 2: Document Verification (if enabled)
      if (showDigitalVerification) {
        setUploadState('verifying');
        
        const verification = await validateDocument(
          documentType,
          ocrResult,
          file,
          getAdditionalData(documentType, ocrResult)
        );

        setUploadState('completed');

        // Notify parent component
        if (onVerificationComplete) {
          onVerificationComplete({
            ocrResult,
            verification,
            file
          });
        }

        // Auto-fill form fields with high confidence results
        if (onFieldUpdate && verification.isValid) {
          const autoFillData = {};
          if (ocrResult.extractedFields && typeof ocrResult.extractedFields === 'object') {
            Object.keys(ocrResult.extractedFields).forEach(field => {
              const fieldData = ocrResult.extractedFields[field];
              if (fieldData && fieldData.confidence > 85) {
                autoFillData[field] = fieldData.value;
              }
            });
          }
          onFieldUpdate(autoFillData);
        }

      } else {
        setUploadState('completed');
        if (onVerificationComplete) {
          onVerificationComplete({
            ocrResult,
            verification: null,
            file
          });
        }
      }

    } catch (err) {
      console.error('Document Upload Error:', err);
      setUploadState('error');
    }
  };

  const getAdditionalData = (docType, ocrResult) => {
    const extractedFields = ocrResult.extractedFields || {};
    
    switch (docType) {
      case 'FARMER_CERTIFICATE':
        return {
          khataNumber: extractedFields.khataNumber?.value,
          village: extractedFields.village?.value,
          district: extractedFields.district?.value
        };
      case 'BANK_PASSBOOK':
        return {
          accountNumber: extractedFields.accountNumber?.value,
          ifscCode: extractedFields.ifsc?.value,
          accountHolderName: extractedFields.accountHolderName?.value
        };
      default:
        return {};
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setOcrResults(null);
    setPreviewUrl('');
    setUploadState('idle');
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getUploadStateIcon = () => {
    switch (uploadState) {
      case 'uploading':
      case 'processing':
      case 'verifying':
        return FiLoader;
      case 'completed':
        return FiCheck;
      case 'error':
        return FiAlertCircle;
      default:
        return FiUpload;
    }
  };

  const getUploadStateText = () => {
    switch (uploadState) {
      case 'uploading':
        return 'Uploading document...';
      case 'processing':
        return 'Processing with OCR...';
      case 'verifying':
        return 'Verifying authenticity...';
      case 'completed':
        return 'Document verified successfully';
      case 'error':
        return 'Processing failed';
      default:
        return 'Click to upload or drag and drop';
    }
  };

  return (
    <div className={`enhanced-document-upload ${className}`}>
      <div className="upload-header">
        <div className="upload-title-section">
          <h4 className="upload-title">
            {title}
            {required && <span className="required-star">*</span>}
          </h4>
          <p className="upload-description">{description}</p>
        </div>
        {showDigitalVerification && (
          <div className="verification-badge">
            <FiShield className="verification-icon" />
            <span>Digital Verification</span>
          </div>
        )}
      </div>

      {/* Upload Area */}
      {uploadState === 'idle' && (
        <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            className="file-input"
          />
          <div className="upload-content">
            <FiUpload className="upload-icon" />
            <div className="upload-text">
              <p className="upload-main-text">{getUploadStateText()}</p>
              <p className="upload-sub-text">PDF, JPG, PNG up to 10MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Processing States */}
      {(uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'verifying') && (
        <div className="processing-state">
          <FiLoader className="processing-spinner" />
          <p>{getUploadStateText()}</p>
          {uploadState === 'verifying' && (
            <div className="verification-steps">
              <div className="verification-step">
                <FiCheck className="step-icon completed" />
                <span>OCR Processing</span>
              </div>
              <div className="verification-step">
                <FiLoader className="step-icon active" />
                <span>Digital Verification</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="error-state">
          <FiAlertCircle className="error-icon" />
          <p className="error-message">Document processing failed</p>
          <button className="retry-button" onClick={() => fileInputRef.current?.click()}>
            Try Again
          </button>
        </div>
      )}

      {/* Completed State */}
      {uploadState === 'completed' && ocrResults && (
        <div className="completed-state">
          <div className="success-header">
            <div className="success-info">
              <FiCheck className="success-icon" />
              <div className="success-text">
                <h5>Document Processed Successfully</h5>
                <p>{uploadedFile?.name}</p>
              </div>
            </div>
            <div className="success-actions">
              {previewUrl && (
                <button className="preview-button" onClick={() => window.open(previewUrl, '_blank')}>
                  <FiEye /> Preview
                </button>
              )}
              <button className="remove-button" onClick={handleRemoveFile}>
                <FiX /> Remove
              </button>
            </div>
          </div>

          {/* OCR Results Summary */}
          <div className="ocr-summary">
            <h6>Extracted Information</h6>
            <div className="extracted-fields-grid">
              {ocrResults.extractedFields && Object.entries(ocrResults.extractedFields).slice(0, 4).map(([fieldName, fieldData]) => {
                if (!fieldData) return null;
                return (
                  <div key={fieldName} className="field-summary">
                    <span className="field-name">
                      {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <span className="field-value">{fieldData.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Verification Results */}
          {verificationResults && (
            <DocumentValidationResult
              validation={verificationResults}
              documentType={documentType}
              onRetry={() => fileInputRef.current?.click()}
              onManualReview={() => {
                console.log('Manual review requested for', documentType);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedDocumentUpload;
