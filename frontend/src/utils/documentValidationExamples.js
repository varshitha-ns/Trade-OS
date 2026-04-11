// TradeOS Document Validation Examples
// Demonstrates how to use the document validation service

import React, { useState } from 'react';
import { documentValidationService } from '../services/documentValidationService';

// Example 1: Aadhaar Card Validation
export const validateAadhaarCard = async (ocrResult, imageFile) => {
  try {
    const validation = await documentValidationService.validateDocument(
      ocrResult, 
      'AADHAAR_CARD', 
      imageFile
    );
    
    console.log('Aadhaar Validation Result:', validation);
    
    // Handle different risk levels
    switch (validation.riskLevel) {
      case 'low':
        return { status: 'approved', message: 'Aadhaar card verified successfully' };
      case 'medium':
        return { status: 'review', message: 'Aadhaar card requires manual review' };
      case 'high':
        return { status: 'rejected', message: 'Aadhaar card appears suspicious' };
      case 'very_high':
        return { status: 'blocked', message: 'Aadhaar card likely fraudulent' };
      default:
        return { status: 'unknown', message: 'Could not validate Aadhaar card' };
    }
  } catch (error) {
    console.error('Aadhaar validation error:', error);
    return { status: 'error', message: 'Validation service unavailable' };
  }
};

// Example 2: PAN Card Validation
export const validatePANCard = async (ocrResult, imageFile) => {
  try {
    const validation = await documentValidationService.validateDocument(
      ocrResult, 
      'PAN_CARD', 
      imageFile
    );
    
    console.log('PAN Validation Result:', validation);
    
    // Additional PAN-specific checks
    const extractedFields = ocrResult.extractedFields || {};
    const panNumber = extractedFields.panNumber?.value;
    
    if (panNumber) {
      // Quick format validation
      const quickCheck = documentValidationService.quickValidate(panNumber, 'PAN_CARD');
      if (!quickCheck.isValid) {
        return { 
          status: 'rejected', 
          message: `Invalid PAN format: ${quickCheck.error}` 
        };
      }
    }
    
    return {
      status: validation.isValid ? 'approved' : 'review',
      message: validation.isValid ? 'PAN card verified' : 'PAN card needs review',
      confidence: validation.score,
      riskLevel: validation.riskLevel
    };
  } catch (error) {
    console.error('PAN validation error:', error);
    return { status: 'error', message: 'Validation service unavailable' };
  }
};

// Example 3: Real-time Validation for Form Input
export const validateDocumentNumber = (documentNumber, documentType) => {
  const quickCheck = documentValidationService.quickValidate(documentNumber, documentType);
  
  return {
    isValid: quickCheck.isValid,
    error: quickCheck.error,
    suggestions: getValidationSuggestions(documentType, quickCheck.error)
  };
};

// Example 4: Batch Document Validation
export const validateMultipleDocuments = async (documents) => {
  const results = await documentValidationService.batchValidate(documents);
  
  // Analyze batch results
  const summary = {
    total: results.length,
    approved: results.filter(r => r.status === 'valid').length,
    rejected: results.filter(r => r.status === 'invalid').length,
    errors: results.filter(r => r.status === 'error').length,
    requiresReview: results.filter(r => 
      r.validation && r.validation.riskLevel === 'medium'
    ).length
  };
  
  return { results, summary };
};

// Example 5: Document Type Detection
export const detectDocumentType = (ocrResult) => {
  const extractedFields = ocrResult.extractedFields || {};
  
  // Heuristics for document type detection
  if (extractedFields.aadhaarNumber) {
    return 'AADHAAR_CARD';
  }
  if (extractedFields.panNumber) {
    return 'PAN_CARD';
  }
  if (extractedFields.passportNumber) {
    return 'PASSPORT';
  }
  if (extractedFields.voterIdNumber) {
    return 'VOTER_ID';
  }
  if (extractedFields.licenseNumber) {
    return 'DRIVING_LICENSE';
  }
  
  return 'UNKNOWN';
};

// Helper function for validation suggestions
const getValidationSuggestions = (documentType, error) => {
  const suggestions = {
    AADHAAR_CARD: {
      'Expected 12 digits': 'Ensure you enter all 12 digits of your Aadhaar number',
      'Invalid format': 'Aadhaar number should contain only digits, no spaces or letters',
      'Invalid checksum': 'The Aadhaar number appears to be incorrect. Please double-check.'
    },
    PAN_CARD: {
      'Expected 10 characters': 'PAN should be exactly 10 characters (5 letters, 4 numbers, 1 letter)',
      'Invalid format': 'Format should be: ABCDE1234F (5 letters, 4 numbers, 1 letter)',
      'Invalid checksum': 'PAN number structure is incorrect. Please verify your PAN card.'
    }
  };
  
  return suggestions[documentType]?.[error] || 'Please check the document number and try again.';
};

// Example 6: Integration with Form Validation
export const createDocumentValidator = (documentType) => {
  return {
    validate: async (file, ocrResult) => {
      const validation = await documentValidationService.validateDocument(
        ocrResult, 
        documentType, 
        file
      );
      
      return {
        isValid: validation.isValid,
        score: validation.score,
        riskLevel: validation.riskLevel,
        errors: validation.errors,
        warnings: validation.warnings,
        recommendations: validation.recommendations
      };
    },
    
    quickValidate: (documentNumber) => {
      return documentValidationService.quickValidate(documentNumber, documentType);
    },
    
    getRequirements: () => {
      return documentValidationService.validationPatterns[documentType];
    }
  };
};

// Example 7: Risk Assessment Workflow
export const assessDocumentRisk = (validation) => {
  const { score, riskLevel, checks } = validation;
  
  // Critical failure checks
  if (!checks.format || !checks.checksum) {
    return {
      action: 'reject',
      reason: 'Critical validation failures detected',
      requiresHumanReview: false
    };
  }
  
  // High confidence, low risk
  if (score >= 90 && riskLevel === 'low') {
    return {
      action: 'approve',
      reason: 'High confidence validation with low risk',
      requiresHumanReview: false
    };
  }
  
  // Medium risk scenarios
  if (score >= 70 && (riskLevel === 'medium' || riskLevel === 'low')) {
    return {
      action: 'flag_for_review',
      reason: 'Document passes basic checks but requires human verification',
      requiresHumanReview: true
    };
  }
  
  // High risk scenarios
  if (score < 70 || riskLevel === 'high' || riskLevel === 'very_high') {
    return {
      action: 'reject',
      reason: 'Document validation failed or high risk detected',
      requiresHumanReview: false
    };
  }
  
  return {
    action: 'manual_review',
    reason: 'Unable to automatically determine document validity',
    requiresHumanReview: true
  };
};

// Example 8: Document Quality Assessment
export const assessDocumentQuality = (validation) => {
  const qualityScore = validation.checks.quality ? validation.score : 0;
  const securityScore = validation.checks.securityFeatures ? validation.score : 0;
  
  return {
    overall: qualityScore,
    security: securityScore,
    readability: validation.checks.quality ? validation.score : 0,
    authenticity: validation.checks.authenticity ? validation.score : 0,
    recommendations: [
      qualityScore < 70 && 'Improve image quality and lighting',
      securityScore < 60 && 'Ensure security features are visible',
      !validation.checks.format && 'Check document format and completeness',
      !validation.checks.checksum && 'Verify document authenticity'
    ].filter(Boolean)
  };
};

// Example usage in React component
export const useDocumentValidation = (documentType) => {
  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const validateDocument = async (ocrResult, imageFile) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await documentValidationService.validateDocument(
        ocrResult, 
        documentType, 
        imageFile
      );
      setValidation(result);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  const quickValidate = (documentNumber) => {
    return documentValidationService.quickValidate(documentNumber, documentType);
  };
  
  return {
    validation,
    loading,
    error,
    validateDocument,
    quickValidate
  };
};

export default {
  validateAadhaarCard,
  validatePANCard,
  validateDocumentNumber,
  validateMultipleDocuments,
  detectDocumentType,
  createDocumentValidator,
  assessDocumentRisk,
  assessDocumentQuality,
  useDocumentValidation
};
