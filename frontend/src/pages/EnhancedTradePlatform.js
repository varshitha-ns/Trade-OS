import React, { useState } from 'react';
import OCRDocumentUpload from '../components/OCRDocumentUpload';
import AadhaarVerification from '../components/AadhaarVerification';
import { documentValidationService } from '../services/documentValidationService';
import { digitalVerificationService } from '../services/digitalVerificationService';
import '../styles/ocrUpload.css';
import '../styles/documentValidation.css';

const EnhancedTradePlatform = () => {
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [activeTab, setActiveTab] = useState('registration');
  const [registrationData, setRegistrationData] = useState({
    companyInfo: {
      company_name: '',
      business_type: 'exporter',
      registration_number: '',
      tax_id: '',
      email: '',
      phone: '',
      website: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postal_code: ''
      },
      business_description: '',
      years_in_business: 0,
      company_size: 'small'
    },
    tradeProfile: {
      primary_products: [],
      product_categories: [],
      hs_codes: [],
      trade_regions: [],
      preferred_payment_terms: [],
      shipping_methods: []
    },
    userInfo: {
      name: '',
      position: '',
      contact_email: ''
    }
  });
  
  const [tradeDescription, setTradeDescription] = useState('');
  const [parsedItem, setParsedItem] = useState(null);
  const [matchmakerResults, setMatchmakerResults] = useState(null);
  const [negotiationResult, setNegotiationResult] = useState(null);
  const [documentAgentResult, setDocumentAgentResult] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documentVerification, setDocumentVerification] = useState({
    business_registration: null,
    tax_certificate: null,
    import_license: null,
    export_license: null,
    quality_certificates: null,
    bank_reference: null,
    identity_proof: null
  });
  const [verificationStatus, setVerificationStatus] = useState('pending');

  // Logistics Agent State
  const [logisticsRoutes, setLogisticsRoutes] = useState(null);
  const [logisticsBooking, setLogisticsBooking] = useState(null);
  const [logisticsTracking, setLogisticsTracking] = useState(null);

  // LangChain Orchestrator State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: 'Hi! I am the TradeOS LangChain Orchestrator. Tell me what you want to export or ask me for live commodity prices in plain text.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Get required documents based on business type
  const getRequiredDocuments = (businessType) => {
    const documents = {
      importer: [
        { key: 'business_registration', title: 'Business Registration Certificate', type: 'BUSINESS_REGISTRATION' },
        { key: 'tax_certificate', title: 'Tax Registration Certificate', type: 'TAX_CERTIFICATE' },
        { key: 'import_license', title: 'Import License', type: 'IMPORT_LICENSE' },
        { key: 'bank_reference', title: 'Bank Reference Letter', type: 'BANK_REFERENCE' },
        { key: 'identity_proof', title: 'Identity Proof (Aadhaar/PAN/Passport)', type: 'AADHAAR_CARD' }
      ],
      exporter: [
        { key: 'business_registration', title: 'Business Registration Certificate', type: 'BUSINESS_REGISTRATION' },
        { key: 'tax_certificate', title: 'Tax Registration Certificate', type: 'TAX_CERTIFICATE' },
        { key: 'export_license', title: 'Export License', type: 'EXPORT_LICENSE' },
        { key: 'quality_certificates', title: 'Quality Certificates', type: 'QUALITY_CERTIFICATE' },
        { key: 'bank_reference', title: 'Bank Reference Letter', type: 'BANK_REFERENCE' },
        { key: 'identity_proof', title: 'Identity Proof (Aadhaar/PAN/Passport)', type: 'AADHAAR_CARD' }
      ],
      both: [
        { key: 'business_registration', title: 'Business Registration Certificate', type: 'BUSINESS_REGISTRATION' },
        { key: 'tax_certificate', title: 'Tax Registration Certificate', type: 'TAX_CERTIFICATE' },
        { key: 'import_license', title: 'Import License', type: 'IMPORT_LICENSE' },
        { key: 'export_license', title: 'Export License', type: 'EXPORT_LICENSE' },
        { key: 'quality_certificates', title: 'Quality Certificates', type: 'QUALITY_CERTIFICATE' },
        { key: 'bank_reference', title: 'Bank Reference Letter', type: 'BANK_REFERENCE' },
        { key: 'identity_proof', title: 'Identity Proof (Aadhaar/PAN/Passport)', type: 'AADHAAR_CARD' }
      ]
    };
    return documents[businessType] || [];
  };

  // Handle document upload and verification
  const handleDocumentUpload = async (documentKey, ocrResult, validationResults, autoFillData = null) => {
    setDocumentVerification(prev => ({
      ...prev,
      [documentKey]: {
        ocrResult,
        validationResults,
        uploadedAt: new Date().toISOString(),
        status: validationResults?.isValid ? 'verified' : 'pending_review'
      }
    }));

    // Auto-fill form fields from OCR results
    if (!autoFillData && ocrResult && ocrResult.extractedFields) {
      autoFillData = {};
      Object.keys(ocrResult.extractedFields).forEach(field => {
        const fieldData = ocrResult.extractedFields[field];
        if (fieldData && fieldData.confidence > 85) {
          autoFillData[field] = fieldData.value;
        }
      });
    }

    if (autoFillData) {

      // Update registration data with extracted information
      if (autoFillData.name && !registrationData.companyInfo.company_name) {
        setRegistrationData(prev => ({
          ...prev,
          companyInfo: {
            ...prev.companyInfo,
            company_name: autoFillData.name
          }
        }));
      }

      if (autoFillData.panNumber && !registrationData.companyInfo.tax_id) {
        setRegistrationData(prev => ({
          ...prev,
          companyInfo: {
            ...prev.companyInfo,
            tax_id: autoFillData.panNumber
          }
        }));
      }
    }

    // Perform digital verification for Aadhaar cards
    if (documentKey === 'identity_proof' && ocrResult && ocrResult.extractedFields) {
      await performDigitalVerification(documentKey, ocrResult);
    }
  };

  // Digital verification using government APIs
  const performDigitalVerification = async (documentKey, ocrResult) => {
    try {
      const extractedFields = ocrResult.extractedFields;
      let digitalVerificationResult = null;

      // Aadhaar digital verification
      if (extractedFields.aadhaarNumber && extractedFields.name) {
        console.log('Performing Aadhaar digital verification...');
        digitalVerificationResult = await digitalVerificationService.verifyAadhaar(
          extractedFields.aadhaarNumber.value,
          extractedFields.name.value
        );
      }

      // PAN digital verification
      if (extractedFields.panNumber && extractedFields.name) {
        console.log('Performing PAN digital verification...');
        digitalVerificationResult = await digitalVerificationService.verifyPAN(
          extractedFields.panNumber.value,
          extractedFields.name.value
        );
      }

      // Update document verification with digital verification result
      if (digitalVerificationResult) {
        setDocumentVerification(prev => ({
          ...prev,
          [documentKey]: {
            ...prev[documentKey],
            digitalVerification: digitalVerificationResult,
            status: digitalVerificationResult.isValid ? 'digitally_verified' : prev[documentKey].status,
            verifiedAt: new Date().toISOString()
          }
        }));

        // Show verification result to user
        if (digitalVerificationResult.isValid) {
          alert(`${documentKey.replace('_', ' ').toUpperCase()} digitally verified with government database!\n\n${digitalVerificationResult.message}`);
        } else {
          alert(`${documentKey.replace('_', ' ').toUpperCase()} digital verification failed:\n\n${digitalVerificationResult.error || digitalVerificationResult.message}`);
        }
      }

    } catch (error) {
      console.error('Digital verification error:', error);
      alert(`❌ Digital verification failed: ${error.message}`);
    }
  };

  // Check overall verification status
  const checkVerificationStatus = () => {
    const requiredDocs = getRequiredDocuments(registrationData.companyInfo.business_type);
    const uploadedDocs = Object.keys(documentVerification).filter(key => 
      documentVerification[key] && (
        documentVerification[key].status === 'verified' || 
        documentVerification[key].status === 'digitally_verified'
      )
    );
    
    if (uploadedDocs.length === requiredDocs.length) {
      setVerificationStatus('verified');
    } else if (uploadedDocs.length > 0) {
      setVerificationStatus('partial');
    } else {
      setVerificationStatus('pending');
    }
  };

  // Submit registration with document verification
  const submitRegistration = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/registration/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...registrationData,
          documents: Object.entries(documentVerification).map(([key, data]) => ({
            document_type: key,
            document_number: data?.ocrResult?.extractedFields?.documentNumber?.value || '',
            issued_by: data?.ocrResult?.extractedFields?.issuedBy?.value || 'Government',
            issue_date: data?.ocrResult?.extractedFields?.issueDate?.value || new Date().toISOString().split('T')[0],
            verification_status: data?.status || 'pending',
            verification_date: data?.uploadedAt || new Date().toISOString(),
            document_url: data?.ocrResult?.imageUrl || ''
          }))
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert('Registration successful! ID: ' + data.registration_id);
        console.log('Registration result:', data);
      } else {
        alert('Registration failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Parse trade description
  const parseTradeItem = async () => {
    if (!tradeDescription.trim()) {
      alert('Please enter a trade description');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/trade-parser/parse-item?description=${encodeURIComponent(tradeDescription)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        setParsedItem(data.parsed_item);
        setActiveTab('matchmaker');
      } else {
        const errorMessage = data.detail || (typeof data === 'object' ? JSON.stringify(data) : 'Unknown error');
        alert('Parsing failed: ' + errorMessage);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Run matchmaker agent
  const runMatchmaker = async () => {
    if (!parsedItem) {
      alert('Please parse a trade item first');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/matchmaker/recommend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsedItem)
      });

      const data = await response.json();
      
      if (response.ok) {
        setMatchmakerResults(data);
      } else {
        alert('Matchmaker failed: ' + (data.detail || 'Unknown error'));
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Run Autonomous Negotiation Agent
  const runNegotiationAgent = async (supplier) => {
    setLoading(true);
    setActiveTab('negotiator');
    
    // Create payload
    const payload = {
      product_name: parsedItem?.product_name || supplier.company_name,
      quantity: parsedItem?.quantity || 1000,
      price: parsedItem?.price ? parsedItem.price * 1.15 : 1250.00, // Mock initial supplier quote (15% markup over hypothetical assumed base in INR)
      supplier_id: supplier.supplier_id,
      delivery_terms: 'FOB'
    };

    try {
      const response = await fetch('http://localhost:8000/api/intelligence/negotiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        setNegotiationResult({...data, supplier});
      } else {
        alert('Negotiation failed: ' + (data.detail || 'Unknown error'));
        setActiveTab('matchmaker');
      }
    } catch (error) {
      alert('Error running Negotiation Agent: ' + error.message);
      setActiveTab('matchmaker');
    } finally {
      setLoading(false);
    }
  };

  // Run Document Agent
  const runDocumentAgent = async (supplier) => {
    setLoading(true);
    setActiveTab('document-agent');
    
    // Create the Trade Context request payload
    const tradeData = {
      trade_id: `TRD-${Math.floor(Math.random() * 10000)}`,
      supplier_id: supplier.supplier_id,
      buyer_id: `BUY-${registrationData.companyInfo.company_name.substring(0,5).toUpperCase() || 'ANON'}`,
      exporter_country: supplier.country,
      importer_country: registrationData.companyInfo.address.country || parsedItem?.destination_country || 'USA',
      hs_code: parsedItem?.hs_code_suggestion || supplier.hs_code || '000000',
      product_category: parsedItem?.product_category || 'General',
      product_name: parsedItem?.product_name || supplier.company_name,
      quantity: parsedItem?.quantity || 1000,
      price: 5.5,
      logistics_mode: 'Sea Freight', // Hardcoded default for demo
      delivery_terms: 'FOB',
      payment_terms: 'LC'
    };

    try {
      const response = await fetch('http://localhost:8000/api/document-agent/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData)
      });

      const data = await response.json();
      
      if (response.ok) {
        setDocumentAgentResult(data);
      } else {
        alert('Document Agent failed: ' + (data.detail || 'Unknown error'));
        setActiveTab('matchmaker');
      }
    } finally {
      setLoading(false);
    }
  };

  // Process Orchestrator Chat Query
  const submitChat = async () => {
    if (!chatInput.trim()) return;
    
    const query = chatInput.trim();
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: query }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/orchestrator/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      
      if (response.ok) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.message }]);
        
        // Execute UI navigation if LLM routed a command
        if (data.action_type === 'navigate_matchmaker') {
          setActiveTab('parser');
          if (data.action_target) {
            setTradeDescription(`I want to export 5 tons of ${data.action_target}`);
          }
        }
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', content: 'Error: ' + data.detail }]);
      }
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', content: 'Connection error to Orchestrator.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') submitChat();
  };

  // Handle registration form changes
  const handleRegistrationChange = (section, field, value) => {
    setRegistrationData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Check verification status whenever documents change
  React.useEffect(() => {
    checkVerificationStatus();
  }, [documentVerification, registrationData.companyInfo.business_type]);

  const requiredDocuments = getRequiredDocuments(registrationData.companyInfo.business_type);

  // Dynamic port states for live production usage
  const [originPort, setOriginPort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");

  // Auto-fill ports when supplier is chosen
  React.useEffect(() => {
    if (negotiationResult?.supplier?.country && !originPort) {
      setOriginPort(`${negotiationResult.supplier.country} Port`);
    }
    if (registrationData?.companyInfo?.address?.city && !destinationPort) {
      setDestinationPort(`${registrationData.companyInfo.address.city} Port`);
    } else if (parsedItem?.destination_country && !destinationPort) {
      setDestinationPort(`${parsedItem.destination_country} Port`);
    }
  }, [negotiationResult, registrationData, parsedItem]);

  // Trigger real Risk Agent backend API
  const runRiskAgent = async () => {
    setLoading(true);
    setRiskResult(null);
    try {
      const supplierName = negotiationResult?.supplier?.company_name || "Unknown";
      const supplierId = negotiationResult?.supplier?.supplier_id || "sup_001";
      const supplierCountry = parsedItem?.origin_country || negotiationResult?.supplier?.country || "China";
      const buyerCountry = parsedItem?.destination_country || registrationData?.companyInfo?.address?.country || "India";
      
      const tradePayload = {
        supplier_id: supplierId,
        country: supplierCountry,
        buyer_country: buyerCountry,
        hs_code: parsedItem?.hs_code_suggestion || "091030",
        price: negotiationResult?.final_agreed_price || 100.0,
        payment_terms: "Letter of Credit",
        buyer_port: buyerCountry,
        supplier_port: supplierCountry
      };

      const res = await fetch('http://localhost:8000/api/risk/assess-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        setRiskResult({
          supplierName: supplierName,
          ...data.risk_report
        });
      } else {
        alert("Risk Agent failed: " + data.detail);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Risk Agent Backend. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  // Trigger Logistics Agent backend API
  const fetchLogisticsRoutes = async () => {
    setLoading(true);
    setLogisticsRoutes(null);
    try {
      const originLocation = parsedItem?.origin_country || negotiationResult?.supplier?.country || "Shanghai";
      const destLocation = parsedItem?.destination_country || registrationData?.companyInfo?.address?.country || "Mumbai";
      
      const tradePayload = {
        supplier_port: originLocation,
        buyer_port: destLocation,
        weight_kg: parsedItem?.quantity ? parseInt(parsedItem.quantity) : 5000,
        commodity: parsedItem?.product_name || "Commodity"
      };

      const res = await fetch('http://localhost:8000/api/logistics/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        setLogisticsRoutes(data.routes);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Logistics Agent.");
    } finally {
      setLoading(false);
    }
  };

  const bookLogisticsRoute = async (routeId) => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/logistics/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_option_id: routeId, trade_id: "TRD-" + Math.floor(Math.random() * 100000) })
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        setLogisticsBooking(data.booking);
        // Auto-fetch tracking after booking
        fetchTracking(data.booking.tracking_number);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracking = async (trackingId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/logistics/track/${trackingId}`);
      const data = await res.json();
      setLogisticsTracking(data);
    } catch (err) {
      console.error(err);
    }
  };


  if (!hasEntered) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Inter, Arial, sans-serif',
        color: 'white',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center' }}>
          
          <h1 style={{ 
            fontSize: '56px', 
            fontWeight: '900', 
            letterSpacing: '-1px', 
            marginBottom: '10px',
            background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Welcome to Trade-OS Platform
          </h1>
          <p style={{ fontSize: '20px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 40px auto', lineHeight: '1.6' }}>
            The autonomous, AI-driven infrastructure for modern global trade. Execute cross-border transactions safely with intelligent document verification, pareto-optimal logistics routing, and real-time risk assessment.
          </p>
          <button 
            onClick={() => setHasEntered(true)}
            style={{
              padding: '16px 40px',
              fontSize: '18px',
              fontWeight: 'bold',
              color: 'white',
              background: 'linear-gradient(to right, #2563eb, #4f46e5)',
              border: 'none',
              borderRadius: '30px',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.6)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 99, 235, 0.4)';
            }}
          >
            Enter Platform →
          </button>
        </div>
      </div>
    );
  }

  if (hasEntered && !isLoggedIn) {
    return (
      <div style={{
        height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa',
        fontFamily: 'Inter, Arial, sans-serif', position: 'fixed', top: 0, left: 0, zIndex: 9998
      }}>
        <div style={{
          backgroundColor: 'white', padding: '40px', borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: '24px' }}>Sign in to TradeOS</h2>
            <p style={{ color: '#64748b', fontSize: '14px', marginTop: '5px' }}>Enter your details below to continue</p>
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>Email Address</label>
            <input 
              type="email" 
              placeholder="you@company.com"
              value={loginForm.email}
              onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
            />
          </div>
          
          <div style={{ marginBottom: '25px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>Password</label>
              <a href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none' }}>Forgot password?</a>
            </div>
            <input 
              type="password" 
              placeholder="••••••••"
              value={loginForm.password}
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box', outline: 'none' }}
              onKeyPress={(e) => e.key === 'Enter' && setIsLoggedIn(true)}
            />
          </div>
          
          <button 
            onClick={() => setIsLoggedIn(true)}
            style={{
              width: '100%', padding: '14px', backgroundColor: '#2563eb', color: 'white',
              border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            Sign In
          </button>
          
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#64748b' }}>
            Don't have an account? <a href="#" onClick={(e) => {
              e.preventDefault();
              setIsLoggedIn(true);
            }} style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'none' }}>Register your business</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Professional B2B Header with Role Switcher */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px 30px',
        backgroundColor: '#0f172a',
        color: 'white',
        borderRadius: '8px',
        marginBottom: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', letterSpacing: '0.5px' }}>TRADE<span style={{color: '#3b82f6'}}>OS</span></h1>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Global B2B Trade Network</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '5px' , borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '13px', color: '#cbd5e1', paddingLeft: '10px' }}>Viewing as:</span>
            <button 
              onClick={() => setRegistrationData(prev => ({...prev, companyInfo: {...prev.companyInfo, business_type: 'importer'}}))}
              style={{
                backgroundColor: registrationData.companyInfo.business_type === 'importer' ? '#3b82f6' : 'transparent',
                color: registrationData.companyInfo.business_type === 'importer' ? 'white' : '#94a3b8',
                border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s'
              }}
            >
              Importer
            </button>
            <button 
              onClick={() => setRegistrationData(prev => ({...prev, companyInfo: {...prev.companyInfo, business_type: 'exporter'}}))}
              style={{
                backgroundColor: registrationData.companyInfo.business_type === 'exporter' ? '#10b981' : 'transparent',
                color: registrationData.companyInfo.business_type === 'exporter' ? 'white' : '#94a3b8',
                border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', transition: 'all 0.2s'
              }}
            >
              Exporter
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Sleek B2B Styling) */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '30px', 
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        gap: '5px',
        padding: '0 10px',
        overflowX: 'auto'
      }}>
        {[
          { id: 'registration', icon: '👤', label: 'Registration & Verification' },
          { id: 'parser', icon: '', label: 'Trade Parser' },
          { id: 'matchmaker', icon: '', label: 'Matchmaker Agent' },
          { id: 'negotiator', icon: '', label: 'Market & Negotiation Agent' },
          { id: 'document-agent', icon: '', label: 'Document Agent' },
          { id: 'logistics-agent', icon: '', label: 'Logistics Agent' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              borderBottom: activeTab === tab.id ? '3px solid #2563eb' : '3px solid transparent',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Enhanced Registration Tab with Document Verification */}
      {activeTab === 'registration' && (
        <div style={{
          border: '2px solid #0d6efd',
          borderRadius: '10px',
          padding: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#0d6efd', marginBottom: '20px' }}>
            Importer/Exporter Registration with Document Verification
          </h2>
          
          {/* Verification Status Badge */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 'bold',
              backgroundColor: verificationStatus === 'verified' ? '#28a745' : 
                              verificationStatus === 'partial' ? '#ffc107' : '#6c757d',
              color: 'white'
            }}>
              Verification Status: {verificationStatus.replace('_', ' ').toUpperCase()}
            </span>
            {verificationStatus === 'verified' && (
              <span style={{
                marginLeft: '10px',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                backgroundColor: '#d1ecf1',
                color: '#0c5460'
              }}>
                🔐 Government Verified
              </span>
            )}
          </div>
          
          {/* Company Information */}
          <div style={{ marginBottom: '30px' }}>
            <h3>Company Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Company Name:</label>
                  <input
                    type="text"
                    value={registrationData.companyInfo.company_name}
                    onChange={(e) => handleRegistrationChange('companyInfo', 'company_name', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ced4da' }}
                    placeholder="Enter company name"
                  />
                </div>
                

                
                <div style={{ marginBottom: '10px' }}>
                  <label>Email:</label>
                  <input
                    type="email"
                    value={registrationData.companyInfo.email}
                    onChange={(e) => handleRegistrationChange('companyInfo', 'email', e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ced4da' }}
                    placeholder="company@example.com"
                  />
                </div>
              </div>
              
              <div>
                <div style={{ marginBottom: '10px' }}>
                  <label>Country:</label>
                  <input
                    type="text"
                    value={registrationData.companyInfo.address.country}
                    onChange={(e) => handleRegistrationChange('companyInfo', 'address', {
                      ...registrationData.companyInfo.address,
                      country: e.target.value
                    })}
                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ced4da' }}
                    placeholder="Country"
                  />
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label>Years in Business:</label>
                  <input
                    type="number"
                    value={registrationData.companyInfo.years_in_business}
                    onChange={(e) => handleRegistrationChange('companyInfo', 'years_in_business', parseInt(e.target.value))}
                    style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ced4da' }}
                    placeholder="Years"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Document Verification Section */}
          <div style={{ marginBottom: '30px' }}>
            <h3>Required Documents for {registrationData.companyInfo.business_type.toUpperCase()}</h3>
            <p style={{ color: '#6c757d', marginBottom: '20px' }}>
              Upload all required documents. Each document will be automatically verified using OCR and AI validation.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {requiredDocuments.map(doc => (
                <div key={doc.key} style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: 'white'
                }}>
                  <h4 style={{ color: '#495057', marginBottom: '10px' }}>
                    {doc.title}
                  </h4>
                  
                  <OCRDocumentUpload
                    title={doc.title}
                    description={`Upload your ${doc.title.toLowerCase()}`}
                    documentType={doc.type}
                    required={true}
                    onOCRComplete={(ocrResult, validationResults) => 
                      handleDocumentUpload(doc.key, ocrResult, validationResults)
                    }
                  />
                  
                  {/* Use QR Code Verification for Aadhaar cards */}
                  {doc.key === 'identity_proof' && doc.type === 'AADHAAR_CARD' && (
                    <div style={{ marginTop: '15px', padding: '15px', border: '2px dashed #0d6efd', borderRadius: '8px', backgroundColor: '#f8f9fa' }}>
                      <h5 style={{ color: '#0d6efd', marginBottom: '10px', fontSize: '14px' }}>
                        🔄 QR Code Verification (Recommended)
                      </h5>
                      <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
                        For better accuracy, upload your Aadhaar card below for QR code scanning and digital signature verification.
                      </p>
                      <AadhaarVerification />
                    </div>
                  )}
                  
                  {/* Document Status */}
                  {documentVerification[doc.key] && (
                    <div style={{ marginTop: '10px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        backgroundColor: 
                          documentVerification[doc.key].status === 'digitally_verified' ? '#d1ecf1' :
                          documentVerification[doc.key].status === 'verified' ? '#d4edda' : 
                          '#fff3cd',
                        color: 
                          documentVerification[doc.key].status === 'digitally_verified' ? '#0c5460' :
                          documentVerification[doc.key].status === 'verified' ? '#155724' : 
                          '#856404'
                      }}>
                        {documentVerification[doc.key].status.replace('_', ' ').toUpperCase()}
                      </span>
                      
                      {documentVerification[doc.key].validationResults && (
                        <div style={{ marginTop: '5px', fontSize: '12px', color: '#6c757d' }}>
                          Score: {documentVerification[doc.key].validationResults.score}% | 
                          Risk: {documentVerification[doc.key].validationResults.riskLevel}
                        </div>
                      )}
                      
                      {documentVerification[doc.key].digitalVerification && (
                        <div style={{ marginTop: '5px', fontSize: '12px', color: '#0c5460' }}>
                          🔐 Digital: {documentVerification[doc.key].digitalVerification.confidence}% confidence
                          {documentVerification[doc.key].digitalVerification.details && (
                            <div style={{ fontSize: '11px', marginTop: '2px' }}>
                              {documentVerification[doc.key].digitalVerification.details.maskedAadhaar && 
                                `ID: ${documentVerification[doc.key].digitalVerification.details.maskedAadhaar}`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={submitRegistration}
            disabled={loading || verificationStatus !== 'verified'}
            style={{
              backgroundColor: (loading || verificationStatus !== 'verified') ? '#6c757d' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: (loading || verificationStatus !== 'verified') ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              marginTop: '20px'
            }}
          >
            {loading ? 'Processing...' : 
             verificationStatus === 'verified' ? 'Complete Registration' :
             verificationStatus === 'partial' ? 'Complete Document Verification' :
             'Upload Required Documents'}
          </button>
        </div>
      )}

      {/* Trade Parser Tab */}
      {activeTab === 'parser' && (
        <div style={{
          border: '2px solid #17a2b8',
          borderRadius: '10px',
          padding: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#17a2b8', marginBottom: '20px' }}>
            Trade Item Parser
          </h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              Describe what you want to trade:
            </label>
            <textarea
              value={tradeDescription}
              onChange={(e) => setTradeDescription(e.target.value)}
              style={{
                width: '100%',
                height: '120px',
                padding: '10px',
                borderRadius: '5px',
                border: '1px solid #ced4da',
                fontSize: '14px'
              }}
              placeholder="Example: I want to import 5000 kg of organic turmeric powder from India to Germany within 30 days with USDA organic certification"
            />
          </div>
          
          <button
            onClick={parseTradeItem}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#6c757d' : '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            {loading ? 'Parsing...' : 'Parse Trade Item'}
          </button>
          
          {parsedItem && (
            <div style={{
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#d1ecf1',
              borderRadius: '5px',
              border: '1px solid #bee5eb'
            }}>
              <h4 style={{ color: '#0c5460' }}>Parsed Trade Item</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <strong>Product:</strong> {parsedItem.product_name}<br/>
                  <strong>Category:</strong> {parsedItem.product_category}<br/>
                  <strong>Quantity:</strong> {parsedItem.quantity} {parsedItem.unit}<br/>
                  <strong>HS Code:</strong> {parsedItem.hs_code_suggestion}
                </div>
                <div>
                  <strong>Origin:</strong> {parsedItem.origin_country || "Not specified"}<br/>
                  <strong>Destination:</strong> {parsedItem.destination_country || "Not specified"}<br/>
                  <strong>Quality:</strong> {parsedItem.quality_requirements.join(', ')}<br/>
                  <strong>Certifications:</strong> {parsedItem.certifications_required.join(', ')}<br/>
                  <strong>Confidence:</strong> {Math.round(parsedItem.confidence_score * 100)}%
                </div>
              </div>
              
              <button
                onClick={() => setActiveTab('matchmaker')}
                style={{
                  backgroundColor: '#0d6efd',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginTop: '15px'
                }}
              >
                Run Matchmaker Agent →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Matchmaker Tab */}
      {activeTab === 'matchmaker' && (
        <div style={{
          border: '2px solid #28a745',
          borderRadius: '10px',
          padding: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#28a745', marginBottom: '20px' }}>
            Matchmaker Agent Results
          </h2>
          
          {!parsedItem ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>
                Please parse a trade item first in the Trade Parser tab
              </p>
              <button
                onClick={() => setActiveTab('parser')}
                style={{
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Go to Trade Parser
              </button>
            </div>
          ) : (
            <div>
              <div style={{
                padding: '15px',
                backgroundColor: '#d4edda',
                borderRadius: '5px',
                marginBottom: '20px'
              }}>
                <h4>Ready to Match: {parsedItem.product_name}</h4>
                <p>Quantity: {parsedItem.quantity} {parsedItem.unit} | Destination: {parsedItem.destination_country}</p>
                <button
                  onClick={runMatchmaker}
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {loading ? 'AI Working...' : 'Run Matchmaker Agent'}
                </button>
              </div>
              
              {matchmakerResults && (
                <div style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '5px',
                  border: '1px solid #28a745'
                }}>
                  <h4 style={{ color: '#155724' }}>AI Matchmaker Recommendations</h4>
                  <p><strong>Status:</strong> {matchmakerResults.success ? 'Success' : 'Failed'}</p>
                  <p><strong>Processing Time:</strong> {matchmakerResults.processing_time_ms}ms</p>
                  
                  {matchmakerResults.filter_report && (
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '15px' }}>
                      Filtered {matchmakerResults.filter_report.initial_count} suppliers. 
                      {matchmakerResults.filter_report.final_count} eligible.
                      {matchmakerResults.filter_report.filter_breakdown && (
                        <div style={{ marginTop: '6px' }}>
                          Risk: {matchmakerResults.filter_report.filter_breakdown.after_risk} | HS: {matchmakerResults.filter_report.filter_breakdown.after_hs} | Capacity: {matchmakerResults.filter_report.filter_breakdown.after_capacity} | Destination: {matchmakerResults.filter_report.filter_breakdown.after_destination}
                        </div>
                      )}
                      {matchmakerResults.filter_report.destination_filter_fallback && (
                        <div style={{ marginTop: '4px' }}>
                          Destination filter fallback used (no exact import-partner matches).
                        </div>
                      )}
                    </div>
                  )}
                  
                  {matchmakerResults.recommendations && (
                    <div>
                      <h5>Top Ranked Suppliers:</h5>
                      {matchmakerResults.recommendations.map((supplier, index) => (
                        <div key={supplier.supplier_id} style={{
                          border: '1px solid #28a745',
                          borderRadius: '8px',
                          padding: '15px',
                          marginBottom: '15px',
                          backgroundColor: '#f8f9fa',
                          position: 'relative'
                        }}>
                          <div style={{ 
                            position: 'absolute', 
                            top: '10px', 
                            right: '15px', 
                            fontSize: '24px', 
                            fontWeight: 'bold', 
                            color: '#28a745',
                            opacity: 0.2
                          }}>
                            #{index + 1}
                          </div>
                          
                          <h6 style={{ fontSize: '18px', margin: '0 0 10px 0' }}>
                            {supplier.company_name} 
                            <span style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'normal', marginLeft: '10px' }}>
                              {supplier.country}
                            </span>
                          </h6>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                            <div>
                              <p style={{ margin: '2px 0' }}>
                                <strong>Match Score:</strong> 
                                <span style={{ color: '#28a745', fontSize: '18px', marginLeft: '5px' }}>
                                  {Math.round(supplier.final_score * 100)}%
                                </span>
                              </p>
                              <p style={{ margin: '2px 0', fontSize: '13px' }}>
                                <strong>Success Rate:</strong> {Math.round(supplier.success_rate * 100)}%
                              </p>
                            </div>
                            <div>
                              <p style={{ margin: '2px 0', fontSize: '13px' }}>
                                <strong>Verification:</strong> 
                                {supplier.aadhaar_verified ? ' Aadhaar' : ''}
                                {supplier.kyc_verified ? ' KYC' : ''}
                                {!supplier.aadhaar_verified && !supplier.kyc_verified ? ' Unverified' : ''}
                              </p>
                              <p style={{ margin: '2px 0', fontSize: '13px' }}>
                                <strong>Rating:</strong> ⭐ {supplier.rating}/5
                              </p>
                            </div>
                          </div>
                          
                          <div style={{ 
                            backgroundColor: '#e9f7ef', 
                            padding: '10px', 
                            borderRadius: '5px', 
                            fontSize: '14px', 
                            fontStyle: 'italic',
                            color: '#155724',
                            borderLeft: '4px solid #28a745',
                            marginBottom: '10px'
                          }}>
                            {supplier.explanation}
                          </div>
                          
                          <button
                            onClick={() => runNegotiationAgent(supplier)}
                            style={{
                              backgroundColor: '#fd7e14',
                              color: 'white',
                              border: 'none',
                              padding: '8px 16px',
                              borderRadius: '5px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              width: '100%',
                              fontWeight: 'bold',
                              marginBottom: '5px'
                            }}
                          >
                            Proceed to Market & Negotiation Agent
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Negotiation Agent Tab */}
      {activeTab === 'negotiator' && (
        <div style={{
          border: '2px solid #fd7e14',
          borderRadius: '10px',
          padding: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#fd7e14', marginBottom: '20px' }}>
            Autonomous Negotiation & Market Intelligence
          </h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
              <h3 style={{ color: '#fd7e14' }}>Agents are working...</h3>
              <p style={{ color: '#6c757d' }}>
                Fetching live commodity futures prices from Yahoo Finance...<br/>
                Computing fair target price...<br/>
                Initiating counter-offers with supplier...
              </p>
            </div>
          ) : !negotiationResult ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>
                Please select a supplier from the Matchmaker Agent tab to initiate autonomous negotiation.
              </p>
              <button
                onClick={() => setActiveTab('matchmaker')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Go to Matchmaker
              </button>
            </div>
          ) : (
            <div>
              {/* Market Intelligence Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{
                  padding: '20px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '10px',
                  border: '1px solid #ffeeba'
                }}>
                  <h4 style={{ color: '#856404', margin: '0 0 15px 0' }}>Live Market Intelligence</h4>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Commodity:</strong> {negotiationResult.market_intelligence.product}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Fair Market Value:</strong> <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>₹{negotiationResult.market_intelligence.market_price}</span> / {negotiationResult.market_intelligence.unit}
                  </div>
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Trend:</strong> {negotiationResult.market_intelligence.market_trend === 'RISING' ? 'RISING' : negotiationResult.market_intelligence.market_trend === 'FALLING' ? '📉 FALLING' : '➡️ STABLE'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '15px' }}>
                    <em>Source: {negotiationResult.market_intelligence.data_source}</em><br/>
                    <em>Last Updated: {new Date(negotiationResult.market_intelligence.timestamp).toLocaleString()}</em>
                  </div>
                </div>

                {/* Negotiation Result Panel */}
                <div style={{
                  padding: '20px',
                  backgroundColor: '#d4edda',
                  borderRadius: '10px',
                  border: '1px solid #c3e6cb'
                }}>
                  <h4 style={{ color: '#155724', margin: '0 0 15px 0' }}>Negotiation Outcome</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <p style={{ color: '#6c757d', margin: '0 0 5px 0' }}>Initial Supplier Quote</p>
                      <h3 style={{ margin: '0', textDecoration: 'line-through', color: '#dc3545' }}>₹{negotiationResult.supplier_initial_quote}</h3>
                    </div>
                    <div>
                      <p style={{ color: '#6c757d', margin: '0 0 5px 0' }}>Final AI Agreed Price</p>
                      <h3 style={{ margin: '0', color: '#28a745' }}>₹{negotiationResult.final_agreed_price}</h3>
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#c3e6cb', borderRadius: '5px' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', color: '#155724' }}>
                      Total AI Savings: <span style={{ fontSize: '20px' }}>₹{negotiationResult.total_savings.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Negotiation Log Console */}
              <div style={{
                backgroundColor: '#212529',
                color: '#f8f9fa',
                padding: '20px',
                borderRadius: '10px',
                fontFamily: 'monospace',
                marginBottom: '20px'
              }}>
                <h5 style={{ color: '#fd7e14', borderBottom: '1px solid #495057', paddingBottom: '10px', marginBottom: '15px' }}>
                  &gt;_ Autonomous Negotiation Thread
                </h5>
                {negotiationResult.negotiation_log.map((log, i) => (
                  <div key={i} style={{ 
                    marginBottom: '10px', 
                    padding: '8px', 
                    backgroundColor: log.includes('(AI)') ? 'rgba(13, 110, 253, 0.2)' : 
                                     log.includes('(Supplier)') ? 'rgba(220, 53, 69, 0.2)' : 'transparent',
                    borderLeft: log.includes('(AI)') ? '3px solid #0d6efd' : 
                                log.includes('(Supplier)') ? '3px solid #dc3545' : 'none'
                  }}>
                    {log}
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => runDocumentAgent(negotiationResult.supplier)}
                  style={{
                    backgroundColor: '#6f42c1',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}
                >
                  Lock in ₹{negotiationResult.final_agreed_price} & Proceed to Document Agent →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Document Agent Tab */}
      {activeTab === 'document-agent' && (
        <div style={{
          border: '2px solid #6f42c1',
          borderRadius: '10px',
          padding: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#6f42c1', marginBottom: '20px' }}>
            Autonomous Document Agent (Trade Intelligence)
          </h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔄</div>
              <h3 style={{ color: '#6f42c1' }}>Agent is working...</h3>
              <p style={{ color: '#6c757d' }}>
                Analyzing trade context, checking supplier compliance in MongoDB, requesting missing certs, and drafting trade/logistics contracts.
              </p>
            </div>
          ) : !documentAgentResult ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: '#6c757d', fontSize: '18px' }}>
                Please select a supplier from the Matchmaker Agent tab to initiate autonomous trade documentation.
              </p>
              <button
                onClick={() => setActiveTab('matchmaker')}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Go to Matchmaker
              </button>
            </div>
          ) : (
            <div>
              <div style={{
                padding: '15px',
                backgroundColor: '#e2d9f3',
                borderRadius: '5px',
                marginBottom: '20px',
                borderLeft: '4px solid #6f42c1'
              }}>
                <h4 style={{ color: '#4a2380' }}>Trade Package Built Successfully! </h4>
                <p style={{ margin: '5px 0' }}><strong>Package ID:</strong> {documentAgentResult.trade_id}</p>
                <p style={{ margin: '5px 0' }}><strong>Status:</strong> <span style={{ fontWeight: 'bold', color: '#28a745' }}>{documentAgentResult.status}</span></p>
              </div>

              <h4 style={{ color: '#495057', marginBottom: '15px' }}>Generated & Validated Documents</h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                {documentAgentResult.documents.map((doc, index) => (
                  <div key={doc.document_id} style={{
                    border: '1px solid #ced4da',
                    borderRadius: '8px',
                    padding: '15px',
                    backgroundColor: 'white',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h5 style={{ margin: 0, color: '#495057' }}>
                        {doc.document_type === 'Commercial Invoice' ? '' :
                         doc.document_type === 'Sales Contract' ? '' :
                         doc.document_type.includes('Certificate') ? '🔖' : 
                         doc.document_type.includes('Bill') || doc.document_type.includes('Waybill') ? '' : ''} 
                        {doc.document_type}
                      </h5>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        backgroundColor: doc.status === 'Validated' ? '#d4edda' : '#e2d9f3',
                        color: doc.status === 'Validated' ? '#155724' : '#4a2380'
                      }}>
                        {doc.status}
                      </span>
                    </div>
                    
                    <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
                      ID: {doc.document_id} | Created: {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    
                    {doc.file_url ? (
                      <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                        <div style={{ 
                          backgroundColor: '#f8f9fa', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          fontSize: '10px',
                          color: '#28a745',
                          wordBreak: 'break-all',
                          marginBottom: '10px',
                          fontFamily: 'monospace',
                          border: '1px solid #c3e6cb'
                        }}>
                          <strong>e-Signature Hash:</strong><br/>
                          {doc.metadata.digital_signature || "Pending computation..."}
                        </div>
                        
                        <a 
                          href={`http://localhost:8000${doc.file_url}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{
                            display: 'block',
                            backgroundColor: '#20c997',
                            color: 'white',
                            textAlign: 'center',
                            textDecoration: 'none',
                            padding: '10px',
                            borderRadius: '5px',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}
                        >
                          📥 Download Draft PDF (Pending e-Sign)
                        </a>
                      </div>
                    ) : (
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '10px', 
                        borderRadius: '5px', 
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        flex: 1
                      }}>
                        {Object.entries(doc.metadata).map(([key, value]) => (
                          <div key={key} style={{ marginBottom: '4px' }}>
                            <strong style={{ color: '#495057', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}:</strong> {value.toString()}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '30px', textAlign: 'center', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', border: '1px solid #ced4da' }}>
                <h4 style={{ color: '#495057', marginBottom: '15px' }}>Define Real-Time Logistics Route</h4>
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '20px' }}>
                  <div style={{ textAlign: 'left', flex: 1, maxWidth: '300px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', marginBottom: '5px' }}>
                      Origin / Exporter Port
                    </label>
                    <input 
                      type="text" 
                      value={originPort}
                      onChange={(e) => setOriginPort(e.target.value)}
                      placeholder="e.g. Shanghai Port"
                      style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ced4da' }}
                    />
                  </div>
                  <div style={{ textAlign: 'left', flex: 1, maxWidth: '300px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#6c757d', marginBottom: '5px' }}>
                      Destination / Importer Port
                    </label>
                    <input 
                      type="text" 
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                      placeholder="e.g. Mumbai Port"
                      style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ced4da' }}
                    />
                  </div>
                </div>
                
                <button
                  disabled={loading}
                  style={{
                    backgroundColor: loading ? '#6c757d' : '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '5px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    width: '100%',
                    maxWidth: '620px'
                  }}
                  onClick={runRiskAgent}
                >
                  {loading ? 'Risk Agent Analyzing Live Datastreams...' : 'Forward Package to Risk Agent'}
                </button>
              </div>
              
              {/* Visual Risk Agent Report Display */}
              {riskResult && (
                <div style={{
                  marginTop: '30px',
                  padding: '25px',
                  border: `2px solid ${riskResult.risk_level === 'HIGH' ? '#dc3545' : riskResult.risk_level === 'MEDIUM' ? '#ffc107' : '#28a745'}`,
                  borderRadius: '10px',
                  backgroundColor: '#ffffff'
                }}>
                  <h3 style={{ 
                    color: riskResult.risk_level === 'HIGH' ? '#dc3545' : riskResult.risk_level === 'MEDIUM' ? '#fd7e14' : '#28a745',
                    margin: '0 0 15px 0'
                  }}>
                    Master Risk Report: {riskResult.supplierName}
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Overall Risk Status</h4>
                      <div style={{ fontSize: '36px', fontWeight: 'bold', color: riskResult.risk_level === 'HIGH' ? '#dc3545' : riskResult.risk_level === 'MEDIUM' ? '#fd7e14' : '#28a745' }}>
                        {riskResult.risk_level} 
                        <span style={{ fontSize: '18px', color: '#6c757d', marginLeft: '10px' }}>({riskResult.risk_score} / 10)</span>
                      </div>
                      <p style={{ margin: '10px 0 0 0', fontWeight: 'bold', color: riskResult.proceed_recommended ? '#28a745' : '#dc3545' }}>
                        {riskResult.proceed_recommended ? "CLEAR TO SHIP" : "🚫 TRADE BLOCKED - ESCROW MANDATED"}
                      </p>
                    </div>
                    
                    <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>5-Pillar Breakdown</h4>
                      <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                        <div><strong>Supplier Capacity Risk:</strong> {riskResult.components.supplier}/10</div>
                        <div><strong>Financial & FX Risk:</strong> {riskResult.components.financial}/10</div>
                        <div><strong>Logistics (OSRM/Weather):</strong> {riskResult.components.logistics}/10</div>
                        <div><strong>Compliance & Tariffs:</strong> {riskResult.components.compliance}/10</div>
                        <div><strong>Market Deviation Risk:</strong> {riskResult.components.market}/10</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', padding: '15px', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>AI Recommendations & Actions</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
                      {riskResult.recommendations.map((rec, i) => (
                        <li key={i} style={{ marginBottom: '5px' }}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Transition to Logistics Button */}
                  {riskResult.proceed_recommended && (
                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                      <button
                        onClick={() => {
                          setActiveTab('logistics-agent');
                          fetchLogisticsRoutes();
                        }}
                        style={{
                          backgroundColor: '#6f42c1',
                          color: 'white',
                          padding: '12px 24px',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}
                      >
                        Risk Cleared: Analyze Multi-Modal Logistics Routes ➜
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Logistics & Tracking Tab */}
      {activeTab === 'logistics-agent' && (
        <div style={{
          border: '2px solid #6f42c1',
          borderRadius: '10px',
          padding: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#6f42c1', marginBottom: '20px' }}>
            Autonomous Logistics Routing & Tracking
          </h2>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div>
              <strong>Origin:</strong> {originPort || 'Auto-selected'} <br/>
              <strong>Destination:</strong> {destinationPort || 'Auto-selected'}
            </div>
            <div>
              <button onClick={fetchLogisticsRoutes} style={{
                backgroundColor: '#0d6efd', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '5px', cursor: 'pointer'
              }}>
                🔄 Rescan Live Shipping Lanes
              </button>
            </div>
          </div>

          {!logisticsRoutes && !loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
              Click the button above to pull live Satellite & Carrier rates.
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6f42c1', fontWeight: 'bold' }}>
              Analyzing Sea, Air, and Land Tradeoffs... Pinging Weather APIs...
            </div>
          )}

          {/* CCT Route Matrix */}
          {!logisticsBooking && logisticsRoutes && (
            <div>
              <h3 style={{ borderBottom: '1px solid #dee2e6', paddingBottom: '10px' }}>Pareto-Optimal Route Options</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {logisticsRoutes.map((route, idx) => (
                  <div key={idx} style={{
                    backgroundColor: 'white',
                    border: route.optimality_score > 7 ? '2px solid #28a745' : '1px solid #ced4da',
                    borderRadius: '8px',
                    padding: '20px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <span style={{ 
                        backgroundColor: route.mode === 'SEA' ? '#0dcaf0' : route.mode === 'AIR' ? '#ffc107' : '#198754',
                        color: route.mode === 'AIR' ? '#000' : '#fff',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        fontSize: '12px'
                      }}>
                        {route.mode} FREIGHT
                      </span>
                      <span style={{ fontWeight: 'bold', color: route.optimality_score > 7 ? '#28a745' : '#495057' }}>
                        Score: {route.optimality_score}
                      </span>
                    </div>
                    
                    <h4 style={{ margin: '0 0 5px 0' }}>Carrier: {route.carrier}</h4>
                    {route.live_weather_alert && (
                      <div style={{ fontSize: '12px', color: '#dc3545', fontWeight: 'bold', marginBottom: '10px' }}>
                        Slowed due to active Storms/Weather Risks
                      </div>
                    )}
                    
                    <div style={{ fontSize: '14px', margin: '15px 0', lineHeight: '1.6', color: '#475569' }}>
                      <div style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#94a3b8', marginRight: '8px' }}>•</span> 
                        <strong>Est. Transit:</strong> {route.metrics.transit_time_days} days
                      </div>
                      <div style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#94a3b8', marginRight: '8px' }}>•</span> 
                        <strong>Est. Cost:</strong> ₹{Math.round(route.metrics.estimated_cost_usd * 83.5).toLocaleString('en-IN')}
                      </div>
                      <div style={{ padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ color: '#94a3b8', marginRight: '8px' }}>•</span> 
                        <strong>Carbon Footprint:</strong> {route.metrics.carbon_footprint_kg.toLocaleString('en-IN')} kg CO2
                      </div>
                      <div style={{ padding: '4px 0' }}>
                        <span style={{ color: '#94a3b8', marginRight: '8px' }}>•</span> 
                        <strong>Safety/Risk Score:</strong> <span style={{ color: route.metrics.safety_baseline >= 8 ? '#10b981' : '#f59e0b', fontWeight: 'bold' }}>{route.metrics.safety_baseline}/10</span>
                      </div>
                    </div>

                    <button
                      onClick={() => bookLogisticsRoute(route.route_option_id)}
                      style={{
                        width: '100%',
                        backgroundColor: '#6f42c1',
                        color: 'white',
                        padding: '10px',
                        border: 'none',
                        borderRadius: '5px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                      }}
                    >
                      Book & Lock This Route
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Booking & Tracking UI */}
          {logisticsBooking && (
            <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #ced4da' }}>
              <h3 style={{ color: '#28a745', margin: '0 0 15px 0' }}>Shipment Successfully Booked</h3>
              <div style={{ display: 'flex', gap: '30px', marginBottom: '20px' }}>
                <div><strong>Routing ID:</strong> {logisticsBooking.route_option_id}</div>
                <div><strong>Master Bill of Lading / Tracking:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{logisticsBooking.tracking_number}</span></div>
              </div>
              
              <div style={{ backgroundColor: '#e9ecef', padding: '15px', borderRadius: '5px' }}>
                <h4 style={{ margin: '0 0 10px 0' }}>📡 Live Satellite Feed</h4>
                {logisticsTracking ? (
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0d6efd', marginBottom: '5px' }}>
                      Status: {logisticsTracking.live_status_code}
                    </div>
                    <div style={{ color: '#495057', marginBottom: '10px' }}>
                      {logisticsTracking.status_description}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      Last Ping: {new Date(logisticsTracking.timestamp).toLocaleString()} ({logisticsTracking.location_ping})
                    </div>
                  </div>
                ) : (
                  <div>Awaiting carrier webhook...</div>
                )}
                <button onClick={() => fetchTracking(logisticsBooking.tracking_number)} style={{ marginTop: '15px', backgroundColor: '#6c757d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  Force Ping Location Update
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Orchestrator AI Widget */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end'
      }}>
        
        {/* Chat Window */}
        {isChatOpen && (
          <div style={{
            width: '350px',
            height: '450px',
            backgroundColor: 'white',
            borderRadius: '10px',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
            marginBottom: '15px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid #dee2e6'
          }}>
            {/* Header */}
            <div style={{
              backgroundColor: '#4c1d95',
              color: 'white',
              padding: '15px',
              fontWeight: 'bold',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>✨ AI Trade Orchestrator</span>
              <button 
                onClick={() => setIsChatOpen(false)}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>
            
            {/* Messages */}
            <div style={{
              flex: 1,
              padding: '15px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              {chatHistory.map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? '#0d6efd' : '#e9ecef',
                  color: msg.role === 'user' ? 'white' : 'black',
                  padding: '10px',
                  borderRadius: '10px',
                  maxWidth: '85%',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {msg.content}
                </div>
              ))}
              {isChatLoading && (
                <div style={{ alignSelf: 'flex-start', backgroundColor: '#e9ecef', padding: '10px', borderRadius: '10px', fontSize: '14px' }}>
                  Thinking... 🧠
                </div>
              )}
            </div>
            
            {/* Input Box */}
            <div style={{
              padding: '10px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              gap: '5px'
            }}>
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="E.g. Price of Turmeric?"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ced4da',
                  outline: 'none'
                }}
              />
              <button 
                onClick={submitChat}
                disabled={isChatLoading}
                style={{
                  backgroundColor: '#4c1d95',
                  color: 'white',
                  border: 'none',
                  padding: '0 15px',
                  borderRadius: '5px',
                  cursor: isChatLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Send
              </button>
            </div>
          </div>
        )}

        {/* Floating Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '30px',
            backgroundColor: '#4c1d95',
            color: 'white',
            border: 'none',
            fontSize: '30px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isChatOpen ? '⬇' : '💬'}
        </button>
      </div>

    </div>
  );
};

export default EnhancedTradePlatform;
