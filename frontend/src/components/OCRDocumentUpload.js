import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiCheck, FiAlertCircle, FiX, FiEye, FiEdit2, FiLoader } from 'react-icons/fi';
import { ocrService } from '../services/ocrService';
import { documentValidationService } from '../services/documentValidationService';
import DocumentValidationResult from './DocumentValidationResult';
import '../styles/ocrUpload.css';
import '../styles/documentValidation.css';

const OCRDocumentUpload = ({ 
  title, 
  description, 
  required = false, 
  documentType,
  onOCRComplete,
  onFieldUpdate,
  className = ''
}) => {
  const [uploadState, setUploadState] = useState('idle'); // idle, uploading, processing, completed, error
  const [uploadedFile, setUploadedFile] = useState(null);
  const [ocrResults, setOcrResults] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [editingFields, setEditingFields] = useState({});
  const [error, setError] = useState('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploadState('uploading');
      setError('');
      setUploadedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }

      // Process document through OCR
      setUploadState('processing');
      setProcessingProgress(0);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 20, 90));
      }, 300);

      // Use OCR service with fallback (real OCR if enabled, otherwise simulation)
      let ocrResult;
      try {
        ocrResult = await ocrService.processDocumentWithFallback(file, documentType);
      } catch (ocrError) {
        console.error('OCR Service Error:', ocrError);
        throw ocrError;
      }

      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (ocrResult && ocrResult.success) {
        setOcrResults(ocrResult);

        if (
          (process.env.REACT_APP_USE_REAL_OCR || '').toLowerCase() === 'true' &&
          ocrResult?.metadata?.source === 'simulated'
        ) {
          setError(
            `Real OCR failed; showing demo extracted data instead. ${ocrResult?.metadata?.fallbackReason || ''}`.trim()
          );
        }
        
        // Perform document validation
        setUploadState('processing');
        setProcessingProgress(95);
        
        let validation;
        try {
          validation = await documentValidationService.validateDocument(
            ocrResult, 
            documentType, 
            file
          );
          setValidationResults(validation);
        } catch (validationError) {
          console.error('Validation Error:', validationError);
          // Continue with OCR results even if validation fails
          validation = { 
            isValid: false, 
            error: 'Validation failed',
            score: 0,
            riskLevel: 'very_high'
          };
          setValidationResults(validation);
        }
        
        setUploadState('completed');
        setProcessingProgress(100);
        // Auto-fill form fields with high confidence results
        const autoFillData = {};
        if (ocrResult.extractedFields && typeof ocrResult.extractedFields === 'object') {
          Object.keys(ocrResult.extractedFields).forEach(field => {
            const fieldData = ocrResult.extractedFields[field];
            if (fieldData && fieldData.confidence > 85) {
              autoFillData[field] = fieldData.value;
            } else if (fieldData && fieldData.confidence <= 85) {
              // Mark lower confidence fields for review
              setEditingFields(prev => ({
                ...prev,
                [field]: fieldData.value
              }));
            }
          });
        }

        // Notify parent component
        if (onOCRComplete) {
          onOCRComplete(ocrResult, validation, autoFillData);
        }

        if (onFieldUpdate) {
          onFieldUpdate(autoFillData);
        }
      } else {
        throw new Error('OCR processing failed - no valid results returned');
      }

    } catch (err) {
      console.error('OCR Upload Error:', err);
      setError(err.message || 'Failed to process document');
      setUploadState('error');
    }
  };

  const handleFieldEdit = (fieldName, value) => {
    setEditingFields(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Update OCR results with user corrections
    if (ocrResults && ocrResults.extractedFields) {
      const updatedResults = {
        ...ocrResults,
        extractedFields: {
          ...ocrResults.extractedFields,
          [fieldName]: {
            ...ocrResults.extractedFields[fieldName],
            value: value,
            source: 'user_corrected',
            confidence: 100 // User input gets 100% confidence
          }
        }
      };
      setOcrResults(updatedResults);

      // Notify parent of field update
      if (onFieldUpdate) {
        onFieldUpdate({ [fieldName]: value });
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    setOcrResults(null);
    setValidationResults(null);
    setEditingFields({});
    setError('');
    setUploadState('idle');
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return '#10b981'; // green
    if (confidence >= 70) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 90) return 'High';
    if (confidence >= 70) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`ocr-document-upload ${className}`}>
      <div className="ocr-upload-header">
        <h4 className="ocr-upload-title">
          {title}
          {required && <span className="required-star">*</span>}
        </h4>
        <p className="ocr-upload-description">{description}</p>
      </div>

      {/* Upload Area */}
      {uploadState === 'idle' && (
        <div className="ocr-upload-area" onClick={() => fileInputRef.current?.click()}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileSelect}
            className="ocr-file-input"
          />
          <div className="ocr-upload-content">
            <FiUpload className="ocr-upload-icon" />
            <div className="ocr-upload-text">
              <p className="ocr-upload-main-text">Click to upload or drag and drop</p>
              <p className="ocr-upload-sub-text">PDF, JPG, PNG up to 10MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Uploading State */}
      {uploadState === 'uploading' && (
        <div className="ocr-processing">
          <FiLoader className="ocr-spinner" />
          <p>Uploading document...</p>
        </div>
      )}

      {/* Processing State */}
      {uploadState === 'processing' && (
        <div className="ocr-processing">
          <FiLoader className="ocr-spinner" />
          <p>Processing document with OCR...</p>
          <div className="ocr-progress-bar">
            <div 
              className="ocr-progress-fill" 
              style={{ width: `${processingProgress}%` }}
            />
          </div>
          <p className="ocr-progress-text">{processingProgress}%</p>
        </div>
      )}

      {/* Error State */}
      {uploadState === 'error' && (
        <div className="ocr-error">
          <FiAlertCircle className="ocr-error-icon" />
          <p className="ocr-error-message">{error}</p>
          <button className="ocr-retry-button" onClick={() => fileInputRef.current?.click()}>
            Try Again
          </button>
        </div>
      )}

      {/* Completed State */}
      {uploadState === 'completed' && ocrResults && (
        <div className="ocr-results">
          <div className="ocr-results-header">
            <div className="ocr-success-indicator">
              <FiCheck className="ocr-success-icon" />
              <span className="ocr-success-text">Document processed successfully</span>
              <span className="ocr-confidence-badge" style={{ 
                backgroundColor: getConfidenceColor(ocrResults.confidence) + '20',
                color: getConfidenceColor(ocrResults.confidence)
              }}>
                {getConfidenceLabel(ocrResults.confidence)} Confidence ({ocrResults.confidence}%)
              </span>
            </div>
            <div className="ocr-results-actions">
              {previewUrl && (
                <button className="ocr-preview-button" onClick={() => window.open(previewUrl, '_blank')}>
                  <FiEye /> Preview
                </button>
              )}
              <button className="ocr-remove-button" onClick={handleRemoveFile}>
                <FiX /> Remove
              </button>
            </div>
          </div>

          {/* Extracted Fields */}
          <div className="ocr-extracted-fields">
            <h5 className="ocr-fields-title">Extracted Information</h5>
            <div className="ocr-fields-grid">
              {ocrResults.extractedFields && Object.entries(ocrResults.extractedFields).map(([fieldName, fieldData]) => {
                if (!fieldData) return null;
                
                const isEditing = editingFields.hasOwnProperty(fieldName);
                const confidence = fieldData.confidence || 0;
                const confidenceColor = getConfidenceColor(confidence);

                return (
                  <div key={fieldName} className="ocr-field-group">
                    <div className="ocr-field-header">
                      <label className="ocr-field-label">
                        {fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </label>
                      <div className="ocr-field-meta">
                        <span 
                          className="ocr-confidence-indicator"
                          style={{ color: confidenceColor }}
                        >
                          {confidence}% confidence
                        </span>
                        {confidence < 85 && (
                          <span className="ocr-review-badge">
                            <FiAlertCircle /> Review required
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ocr-field-input-wrapper">
                      {isEditing ? (
                        <div className="ocr-field-edit">
                          <input
                            type="text"
                            value={editingFields[fieldName]}
                            onChange={(e) => handleFieldEdit(fieldName, e.target.value)}
                            className="ocr-field-input ocr-field-input-editing"
                            placeholder="Enter correct value"
                          />
                          <button 
                            className="ocr-field-save"
                            onClick={() => setEditingFields(prev => {
                              const newEdit = { ...prev };
                              delete newEdit[fieldName];
                              return newEdit;
                            })}
                          >
                            <FiCheck />
                          </button>
                        </div>
                      ) : (
                        <div className="ocr-field-display">
                          <span className="ocr-field-value">{fieldData.value}</span>
                          {confidence < 85 && (
                            <button 
                              className="ocr-field-edit-button"
                              onClick={() => setEditingFields(prev => ({
                                ...prev,
                                [fieldName]: fieldData.value
                              }))}
                            >
                              <FiEdit2 />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Validation Status */}
                    {ocrResults.validation?.fieldValidation?.[fieldName] && (
                      <div className="ocr-field-validation">
                        {ocrResults.validation.fieldValidation[fieldName].status === 'valid' ? (
                          <span className="ocr-validation-success">
                            <FiCheck /> Valid format
                          </span>
                        ) : (
                          <span className="ocr-validation-error">
                            <FiAlertCircle /> Invalid format
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Processing Metadata */}
          <div className="ocr-metadata">
            <div className="ocr-metadata-item">
              <span className="ocr-metadata-label">Processing Time:</span>
              <span className="ocr-metadata-value">{ocrResults.metadata?.processingTime || 'N/A'}</span>
            </div>
            <div className="ocr-metadata-item">
              <span className="ocr-metadata-label">Document Quality:</span>
              <span className="ocr-metadata-value">{ocrResults.metadata?.quality || 'Good'}</span>
            </div>
            <div className="ocr-metadata-item">
              <span className="ocr-metadata-label">File Name:</span>
              <span className="ocr-metadata-value">{uploadedFile?.name}</span>
            </div>
          </div>

          {/* Document Validation Results */}
          {validationResults && (
            <DocumentValidationResult
              validation={validationResults}
              documentType={documentType}
              onRetry={() => fileInputRef.current?.click()}
              onManualReview={() => {
                // Implement manual review workflow
                console.log('Manual review requested for', documentType);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default OCRDocumentUpload;
