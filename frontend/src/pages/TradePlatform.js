import React, { useState } from 'react';

const TradePlatform = () => {
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
  const [loading, setLoading] = useState(false);

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

  // Parse trade description
  const parseTradeItem = async () => {
    if (!tradeDescription.trim()) {
      alert('Please enter a trade description');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/trade-parser/parse-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeDescription)
      });

      const data = await response.json();
      
      if (response.ok) {
        setParsedItem(data.parsed_item);
        setActiveTab('matchmaker');
      } else {
        alert('Parsing failed: ' + (data.detail || 'Unknown error'));
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
      const matchmakerRequest = {
        user_id: "demo_user",
        product_name: parsedItem.product_name,
        product_description: `Parsed from: ${tradeDescription}`,
        hs_code: parsedItem.hs_code_suggestion,
        quantity: parsedItem.quantity || 1000,
        unit: parsedItem.unit || "kg",
        budget_max: 50000,
        destination_country: parsedItem.destination_country || "Germany",
        delivery_deadline: parsedItem.delivery_deadline || "2025-03-15",
        quality_requirements: parsedItem.quality_requirements,
        certifications_required: parsedItem.certifications_required
      };

      const response = await fetch('http://localhost:8000/api/matchmaker/find-suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(matchmakerRequest)
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

  // Submit registration
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
          documents: [] // Documents would be uploaded separately
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

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#0d6efd', marginBottom: '30px', textAlign: 'center' }}>
        🌍 TradeOS Platform - Complete B2B Trade Solution
      </h1>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '30px', 
        borderBottom: '2px solid #e9ecef',
        backgroundColor: '#f8f9fa'
      }}>
        <button
          onClick={() => setActiveTab('registration')}
          style={{
            flex: 1,
            padding: '15px',
            border: 'none',
            backgroundColor: activeTab === 'registration' ? '#0d6efd' : 'transparent',
            color: activeTab === 'registration' ? 'white' : '#495057',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'registration' ? 'bold' : 'normal'
          }}
        >
          👤 Registration
        </button>
        <button
          onClick={() => setActiveTab('parser')}
          style={{
            flex: 1,
            padding: '15px',
            border: 'none',
            backgroundColor: activeTab === 'parser' ? '#0d6efd' : 'transparent',
            color: activeTab === 'parser' ? 'white' : '#495057',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'parser' ? 'bold' : 'normal'
          }}
        >
          📦 Trade Parser
        </button>
        <button
          onClick={() => setActiveTab('matchmaker')}
          style={{
            flex: 1,
            padding: '15px',
            border: 'none',
            backgroundColor: activeTab === 'matchmaker' ? '#0d6efd' : 'transparent',
            color: activeTab === 'matchmaker' ? 'white' : '#495057',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'matchmaker' ? 'bold' : 'normal'
          }}
        >
          🤖 Matchmaker Agent
        </button>
      </div>

      {/* Registration Tab */}
      {activeTab === 'registration' && (
        <div style={{
          border: '2px solid #0d6efd',
          borderRadius: '10px',
          padding: '30px',
          backgroundColor: '#f8f9fa'
        }}>
          <h2 style={{ color: '#0d6efd', marginBottom: '20px' }}>
            📋 Importer/Exporter Registration
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <h3>Company Information</h3>
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
                <label>Business Type:</label>
                <select
                  value={registrationData.companyInfo.business_type}
                  onChange={(e) => handleRegistrationChange('companyInfo', 'business_type', e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ced4da' }}
                >
                  <option value="importer">Importer</option>
                  <option value="exporter">Exporter</option>
                  <option value="both">Both</option>
                </select>
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
            </div>
            
            <div>
              <h3>Trade Profile</h3>
              <div style={{ marginBottom: '10px' }}>
                <label>Primary Products:</label>
                <input
                  type="text"
                  value={registrationData.tradeProfile.primary_products.join(', ')}
                  onChange={(e) => handleRegistrationChange('tradeProfile', 'primary_products', e.target.value.split(', '))}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ced4da' }}
                  placeholder="e.g., Turmeric, Rice, Cotton"
                />
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label>Trade Regions:</label>
                <input
                  type="text"
                  value={registrationData.tradeProfile.trade_regions.join(', ')}
                  onChange={(e) => handleRegistrationChange('tradeProfile', 'trade_regions', e.target.value.split(', '))}
                  style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ced4da' }}
                  placeholder="e.g., Germany, USA, UK"
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
              
              <button
                onClick={submitRegistration}
                disabled={loading}
                style={{
                  backgroundColor: loading ? '#6c757d' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  marginTop: '20px'
                }}
              >
                {loading ? 'Registering...' : '🚀 Register Company'}
              </button>
            </div>
          </div>
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
            📦 Trade Item Parser
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
            {loading ? 'Parsing...' : '🔍 Parse Trade Item'}
          </button>
          
          {parsedItem && (
            <div style={{
              marginTop: '30px',
              padding: '20px',
              backgroundColor: '#d1ecf1',
              borderRadius: '5px',
              border: '1px solid #bee5eb'
            }}>
              <h4 style={{ color: '#0c5460' }}>✅ Parsed Trade Item</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <strong>Product:</strong> {parsedItem.product_name}<br/>
                  <strong>Category:</strong> {parsedItem.product_category}<br/>
                  <strong>Quantity:</strong> {parsedItem.quantity} {parsedItem.unit}<br/>
                  <strong>HS Code:</strong> {parsedItem.hs_code_suggestion}
                </div>
                <div>
                  <strong>Destination:</strong> {parsedItem.destination_country}<br/>
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
                🤖 Run Matchmaker Agent →
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
            🤖 Matchmaker Agent Results
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
                📦 Go to Trade Parser
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
                  {loading ? '🤖 AI Working...' : '🚀 Run Matchmaker Agent'}
                </button>
              </div>
              
              {matchmakerResults && (
                <div style={{
                  padding: '20px',
                  backgroundColor: '#ffffff',
                  borderRadius: '5px',
                  border: '1px solid #28a745'
                }}>
                  <h4 style={{ color: '#155724' }}>🎉 Matchmaker Results</h4>
                  <p><strong>Message:</strong> {matchmakerResults.message}</p>
                  <p><strong>Processing Time:</strong> {matchmakerResults.processing_time_ms}ms</p>
                  
                  <h5>AI Agent Steps:</h5>
                  <ul>
                    {Object.entries(matchmakerResults.results).filter(([key]) => key.startsWith('step')).map(([step, status]) => (
                      <li key={step}>{status}</li>
                    ))}
                  </ul>
                  
                  {matchmakerResults.results.supplier_rankings && (
                    <div>
                      <h5>🏆 Top Supplier Recommendations:</h5>
                      {matchmakerResults.results.supplier_rankings.slice(0, 3).map((supplier, index) => (
                        <div key={supplier.supplier_id} style={{
                          border: '1px solid #28a745',
                          borderRadius: '5px',
                          padding: '15px',
                          marginBottom: '10px',
                          backgroundColor: '#f8f9fa'
                        }}>
                          <h6>#{supplier.rank} - {supplier.company_name} ({supplier.country})</h6>
                          <p>Trust Score: <strong>{supplier.trust_score}</strong></p>
                          <p>ML Adjustment: <span style={{ color: supplier.adjustment_delta > 0 ? '#28a745' : '#dc3545' }}>
                            {supplier.adjustment_delta > 0 ? '+' : ''}{supplier.adjustment_delta}
                          </span></p>
                          <p>Confidence: {Math.round(supplier.adjustment_confidence * 100)}%</p>
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
    </div>
  );
};

export default TradePlatform;
