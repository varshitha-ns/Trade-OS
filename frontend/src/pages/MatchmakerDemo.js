import React, { useState } from 'react';

const MatchmakerDemo = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const sampleRequest = {
    user_id: "buyer_001",
    product_name: "Organic Turmeric Powder",
    product_description: "High quality organic turmeric powder, 95% curcumin content, certified organic",
    hs_code: "09103000",
    quantity: 5000,
    unit: "kg",
    budget_max: 77500,
    destination_country: "Germany",
    delivery_deadline: "2025-03-15",
    quality_requirements: ["Organic Certified", "Non-GMO", "Lab Tested"],
    certifications_required: ["USDA Organic", "EU Organic"],
    payment_terms: "30% advance, 70% on delivery",
    shipping_method: "Sea freight"
  };

  const runMatchmaker = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch('http://localhost:8000/api/matchmaker/find-suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sampleRequest)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to process request');
      }

      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#0d6efd', marginBottom: '20px' }}>
        🤖 Matchmaker Agent Demo
      </h1>

      <div style={{
        border: '2px solid #0d6efd',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h3>Trade Request</h3>
        <p><strong>Product:</strong> {sampleRequest.product_name}</p>
        <p><strong>Description:</strong> {sampleRequest.product_description}</p>
        <p><strong>Quantity:</strong> {sampleRequest.quantity} {sampleRequest.unit}</p>
        <p><strong>Destination:</strong> {sampleRequest.destination_country}</p>
        <p><strong>Budget:</strong> ${sampleRequest.budget_max.toLocaleString()}</p>
        <p><strong>Deadline:</strong> {sampleRequest.delivery_deadline}</p>

        <button
          onClick={runMatchmaker}
          disabled={loading}
          style={{
            backgroundColor: loading ? '#6c757d' : '#0d6efd',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            marginTop: '10px'
          }}
        >
          {loading ? '🤖 AI Agent Working...' : '🚀 Run Matchmaker Agent'}
        </button>
      </div>

      {error && (
        <div style={{
          border: '2px solid #dc3545',
          borderRadius: '10px',
          padding: '20px',
          marginBottom: '20px',
          backgroundColor: '#f8d7da'
        }}>
          <h4 style={{ color: '#721c24' }}>❌ Error</h4>
          <p style={{ color: '#721c24' }}>{error}</p>
        </div>
      )}

      {results && (
        <div style={{
          border: '2px solid #28a745',
          borderRadius: '10px',
          padding: '20px',
          backgroundColor: '#d4edda'
        }}>
          <h4 style={{ color: '#155724' }}>🎉 Matchmaker Results</h4>
          <p style={{ color: '#155724' }}>{results.message}</p>
          <p><strong>Processing Time:</strong> {results.processing_time_ms}ms</p>
          <p><strong>Request ID:</strong> {results.request_id}</p>

          <h5>AI Agent Steps:</h5>
          <ul>
            {Object.entries(results.results).filter(([key]) => key.startsWith('step')).map(([step, status]) => (
              <li key={step}>{status}</li>
            ))}
          </ul>

          {results.results.supplier_rankings && results.results.supplier_rankings.length > 0 && (
            <div>
              <h5>🏆 Top Supplier Rankings:</h5>
              {results.results.supplier_rankings.slice(0, 3).map((supplier, index) => (
                <div key={supplier.supplier_id} style={{
                  border: '1px solid #28a745',
                  borderRadius: '5px',
                  padding: '10px',
                  marginBottom: '10px',
                  backgroundColor: 'white'
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
  );
};

export default MatchmakerDemo;
