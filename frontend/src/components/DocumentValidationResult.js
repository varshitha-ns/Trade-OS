import React from 'react';
import { 
  FiCheckCircle, 
  FiAlertCircle, 
  FiXCircle, 
  FiShield, 
  FiEye, 
  FiInfo,
  FiAlertTriangle,
  FiCheckSquare
} from 'react-icons/fi';

const DocumentValidationResult = ({ validation, documentType, onRetry, onManualReview }) => {
  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981'; // green
    if (score >= 70) return '#f59e0b'; // yellow
    if (score >= 50) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#f97316';
      case 'very_high': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'low': return FiCheckCircle;
      case 'medium': return FiAlertCircle;
      case 'high': return FiAlertTriangle;
      case 'very_high': return FiXCircle;
      default: return FiInfo;
    }
  };

  const getCheckStatusIcon = (passed) => {
    return passed ? FiCheckCircle : FiXCircle;
  };

  const formatCheckName = (checkName) => {
    return checkName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  if (!validation) {
    return (
      <div className="validation-result validation-loading">
        <div className="validation-loading-content">
          <div className="validation-spinner"></div>
          <p>Validating document...</p>
        </div>
      </div>
    );
  }

  const RiskIcon = getRiskIcon(validation.riskLevel);

  return (
    <div className={`validation-result validation-${validation.isValid ? 'success' : 'error'}`}>
      {/* Header */}
      <div className="validation-header">
        <div className="validation-title">
          <FiShield className="validation-icon" />
          <h3>Document Validation Results</h3>
        </div>
        
        <div className="validation-score">
          <div 
            className="score-circle"
            style={{ 
              borderColor: getScoreColor(validation.score),
              color: getScoreColor(validation.score)
            }}
          >
            {validation.score}%
          </div>
          <span className="score-label">Confidence Score</span>
        </div>
      </div>

      {/* Overall Status */}
      <div className="validation-overall">
        <div className={`status-badge status-${validation.riskLevel}`}>
          <RiskIcon className="status-icon" />
          <span>{validation.riskLevel.replace('_', ' ').toUpperCase()} RISK</span>
        </div>
        
        <div className={`validation-message ${validation.isValid ? 'success' : 'error'}`}>
          {validation.isValid ? (
            <span>Document appears authentic and valid</span>
          ) : (
            <span>Document validation failed - please review</span>
          )}
        </div>
      </div>

      {/* Detailed Checks */}
      <div className="validation-checks">
        <h4>Validation Checks</h4>
        <div className="checks-grid">
          {Object.entries(validation.checks).map(([checkName, passed]) => {
            const CheckIcon = getCheckStatusIcon(passed);
            return (
              <div key={checkName} className="check-item">
                <CheckIcon 
                  className={`check-icon ${passed ? 'passed' : 'failed'}`}
                />
                <span className="check-name">{formatCheckName(checkName)}</span>
                <span className={`check-status ${passed ? 'passed' : 'failed'}`}>
                  {passed ? 'Passed' : 'Failed'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Errors */}
      {validation.errors && validation.errors.length > 0 && (
        <div className="validation-errors">
          <h4>Validation Errors</h4>
          <ul className="errors-list">
            {validation.errors.map((error, index) => (
              <li key={index} className="error-item">
                <FiXCircle className="error-icon" />
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {validation.warnings && validation.warnings.length > 0 && (
        <div className="validation-warnings">
          <h4>Warnings</h4>
          <ul className="warnings-list">
            {validation.warnings.map((warning, index) => (
              <li key={index} className="warning-item">
                <FiAlertTriangle className="warning-icon" />
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {validation.recommendations && validation.recommendations.length > 0 && (
        <div className="validation-recommendations">
          <h4>Recommendations</h4>
          <ul className="recommendations-list">
            {validation.recommendations.map((rec, index) => (
              <li key={index} className="recommendation-item">
                <FiInfo className="recommendation-icon" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="validation-actions">
        {!validation.isValid && (
          <button className="btn btn-primary" onClick={onRetry}>
            <FiEye /> Re-upload Document
          </button>
        )}
        
        {(validation.riskLevel === 'high' || validation.riskLevel === 'very_high') && (
          <button className="btn btn-secondary" onClick={onManualReview}>
            <FiCheckSquare /> Request Manual Review
          </button>
        )}
      </div>

      {/* Document Info */}
      <div className="validation-document-info">
        <h5>Document Information</h5>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Document Type:</span>
            <span className="info-value">{documentType.replace('_', ' ')}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Validation Time:</span>
            <span className="info-value">{new Date().toLocaleString()}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Risk Level:</span>
            <span 
              className="info-value" 
              style={{ color: getRiskColor(validation.riskLevel) }}
            >
              {validation.riskLevel.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentValidationResult;
