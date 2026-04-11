import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

class AadhaarVerificationService {
  /**
   * Verify Aadhaar card using QR code method
   * @param {File} file - Aadhaar PDF or image file
   * @returns {Promise<Object>} Verification result
   */
  static async verifyAadhaar(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        `${API_BASE_URL}/api/aadhaar/verify-aadhaar`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      return response.data;
    } catch (error) {
      console.error('Aadhaar verification error:', error);
      
      if (error.response) {
        // Server responded with error status
        throw new Error(
          error.response.data.message || 
          error.response.data.error || 
          'Verification failed'
        );
      } else if (error.request) {
        // Network error
        throw new Error('Network error. Please check your connection.');
      } else {
        // Other error
        throw new Error('An unexpected error occurred during verification.');
      }
    }
  }

  /**
   * Check verification service status
   * @returns {Promise<Object>} Service status
   */
  static async getServiceStatus() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/aadhaar/verify-aadhaar/status`
      );
      return response.data;
    } catch (error) {
      console.error('Service status check error:', error);
      throw new Error('Unable to check service status');
    }
  }

  /**
   * Validate file before upload
   * @param {File} file - File to validate
   * @returns {Object} Validation result
   */
  static validateFile(file) {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      validation.isValid = false;
      validation.errors.push('File size must be less than 10MB');
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (!allowedTypes.includes(file.type)) {
      validation.isValid = false;
      validation.errors.push('Only PDF, JPG, JPEG, and PNG files are allowed');
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const hasValidExtension = allowedExtensions.some(ext => 
      fileName.endsWith(ext)
    );

    if (!hasValidExtension) {
      validation.isValid = false;
      validation.errors.push('Invalid file extension');
    }

    // Warnings
    if (file.size > 5 * 1024 * 1024) {
      validation.warnings.push('Large file may take longer to process');
    }

    if (file.type === 'application/pdf' && file.size > 2 * 1024 * 1024) {
      validation.warnings.push('Large PDF files may have reduced processing quality');
    }

    return validation;
  }

  /**
   * Format verification result for display
   * @param {Object} result - Verification result from API
   * @returns {Object} Formatted result
   */
  static formatVerificationResult(result) {
    if (!result.success) {
      return {
        status: 'error',
        message: result.message || 'Verification failed',
        error: result.error,
        processingTime: result.processingTime
      };
    }

    const { extractedData, verification, confidence, maskedAadhaar } = result;
    
    return {
      status: verification.dataValidation.isValid ? 'success' : 'warning',
      confidence: confidence,
      maskedAadhaar: maskedAadhaar,
      personalInfo: {
        name: extractedData.name,
        dateOfBirth: extractedData.date_of_birth,
        yearOfBirth: extractedData.year_of_birth,
        gender: extractedData.gender
      },
      address: extractedData.address,
      verification: {
        qrCodeFound: verification.qrCodeFound,
        format: verification.format,
        signatureVerified: verification.signatureVerified,
        timestamp: verification.timestamp
      },
      validation: verification.dataValidation,
      processingTime: result.processingTime,
      message: result.message
    };
  }

  /**
   * Get confidence level description
   * @param {number} confidence - Confidence score (0-100)
   * @returns {string} Description
   */
  static getConfidenceLevel(confidence) {
    if (confidence >= 95) return 'Very High';
    if (confidence >= 85) return 'High';
    if (confidence >= 70) return 'Medium';
    if (confidence >= 50) return 'Low';
    return 'Very Low';
  }

  /**
   * Get status color for UI
   * @param {string} status - Status (success, warning, error)
   * @returns {string} Color class
   */
  static getStatusColor(status) {
    switch (status) {
      case 'success':
        return 'green';
      case 'warning':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  }
}

export default AadhaarVerificationService;
