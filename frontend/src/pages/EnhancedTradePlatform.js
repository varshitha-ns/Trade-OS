import React, { useState, useEffect } from 'react';
import OCRDocumentUpload from '../components/OCRDocumentUpload';
import AadhaarVerification from '../components/AadhaarVerification';
import { documentValidationService } from '../services/documentValidationService';
import { digitalVerificationService } from '../services/digitalVerificationService';
import { useAuth } from '../context/AuthContext';
import '../styles/ocrUpload.css';
import '../styles/documentValidation.css';

const EnhancedTradePlatform = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(null);
  
  // Set initial tab based on user role once user is loaded
  useEffect(() => {
    if (user && !activeTab) {
      setActiveTab(user.user_type === 'exporter' ? 'catalog' : 'parser');
    }
  }, [user, activeTab]);

  const resetPlatform = () => {
    if (window.confirm("Are you sure you want to reset the current trade session? All temporary results will be cleared.")) {
      setParsedItem(null);
      setMatchmakerResults(null);
      setNegotiationResult(null);
      setDocumentAgentResult(null);
      setRiskResult(null);
      setBuyerRiskResult(null);
      setLogisticsRoutes(null);
      setLogisticsBooking(null);
      setLogisticsTracking(null);
      setSmartCatalogItem(null);
      setExporterBuyerLeads(null);
      setActiveTab(user.user_type === 'exporter' ? 'catalog' : 'parser');
    }
  };

  // Trade Parser logic...
  const [tradeDescription, setTradeDescription] = useState('');
  const [catalogDescription, setCatalogDescription] = useState('');
  const [smartCatalogItem, setSmartCatalogItem] = useState(null);
  const [parsedItem, setParsedItem] = useState(null);
  const [exporterBuyerLeads, setExporterBuyerLeads] = useState(null);
  const [matchmakerResults, setMatchmakerResults] = useState(null);
  const [negotiationResult, setNegotiationResult] = useState(null);
  const [documentAgentResult, setDocumentAgentResult] = useState(null);
  const [riskResult, setRiskResult] = useState(null);
  const [buyerRiskResult, setBuyerRiskResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logisticsRoutes, setLogisticsRoutes] = useState(null);
  const [logisticsBooking, setLogisticsBooking] = useState(null);
  const [logisticsTracking, setLogisticsTracking] = useState(null);
  const [qcReport, setQcReport] = useState(null);
  const [escrowLedger, setEscrowLedger] = useState(null);
  const [feasibilityReport, setFeasibilityReport] = useState(null);
  const [landedCost, setLandedCost] = useState(null);
  const [coImportGroups, setCoImportGroups] = useState([]);

  // LangChain Orchestrator State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: 'Hi! I am the TradeOS LangChain Orchestrator. Tell me what you want to export or ask me for live commodity prices in plain text.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

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
        // Trigger Intelligence Agents
        fetchFeasibility(data.parsed_item.product_name, data.parsed_item.hs_code_suggestion);
        fetchCoImportGroups(data.parsed_item.product_name);
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

  // Intelligence & MOQ Functions
  const fetchFeasibility = async (product, hs) => {
    try {
      const res = await fetch(`http://localhost:8000/api/intelligence/feasibility?product=${product}&hs_code=${hs}`);
      const data = await res.json();
      setFeasibilityReport(data);
    } catch (e) { console.error(e); }
  };

  const fetchLandedCost = async (price, hs, origin) => {
    try {
      const res = await fetch(`http://localhost:8000/api/intelligence/landed-cost?price=${price}&hs_code=${hs}&origin=${origin}`);
      const data = await res.json();
      setLandedCost(data);
    } catch (e) { console.error(e); }
  };

  const fetchCoImportGroups = async (commodity) => {
    try {
      const res = await fetch(`http://localhost:8000/api/co-import/groups?commodity=${commodity}`);
      const data = await res.json();
      setCoImportGroups(data);
    } catch (e) { console.error(e); }
  };

  const joinGroup = async (groupId) => {
    try {
      const res = await fetch(`http://localhost:8000/api/co-import/join/${groupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: user?.company_name || "SME_USER", quantity: 1000 })
      });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
      } else {
        alert(`Successfully joined group ${groupId}`);
      }
      fetchCoImportGroups(parsedItem.product_name);
    } catch (e) { console.error(e); }
  };

  // Exporter: Generate Smart Catalog
  const generateCatalog = async () => {
    if (!catalogDescription.trim()) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/catalog/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: catalogDescription })
      });
      const data = await response.json();
      if (response.ok && data.catalog_item) {
        setSmartCatalogItem(data.catalog_item);
        // Auto trigger find buyers immediately if using orchestrator workflow
      } else {
        alert('Catalog Agent failed: ' + data.detail);
      }
    } catch (e) {
      alert('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Exporter: Find Buyers using Catalog Item
  const findGlobalBuyers = async () => {
    if (!smartCatalogItem) return;
    setLoading(true);
    setActiveTab('buyer-discovery');
    try {
      const response = await fetch('http://localhost:8000/api/matchmaker_buyer/find-buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smartCatalogItem)
      });
      const data = await response.json();
      if (response.ok) {
        setExporterBuyerLeads(data.leads || []);
      }
    } catch (e) {
      alert('Error fetching buyers: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Run matchmaker agent (Importer Flow)
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
  const runDocumentAgent = async (targetEntity) => {
    if (riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH') {
       alert("CRITICAL: Trade blocked by Compliance Gatekeeper. Automated document execution is disabled due to HIGH risk factors.");
       return;
    }
    setLoading(true);
    setActiveTab('document-agent');
    
    // Create the Trade Context request payload dynamically based on role
    const isExporter = user?.user_type === 'exporter';
    const tradeData = {
      trade_id: `TRD-${Math.floor(Math.random() * 100000)}`,
      supplier_id: isExporter ? (user?.company_name || "Self Supplier") : (targetEntity?.supplier_id || "Unknown Supplier"),
      buyer_id: isExporter ? (targetEntity?.buyer_id || targetEntity?.company_name || "Unknown Buyer") : `BUY-${user?.company_name?.substring(0,5).toUpperCase() || 'ANON'}`,
      exporter_country: isExporter ? (user?.country || "Export Country") : (targetEntity?.country || "Exporter Country"),
      importer_country: isExporter ? (targetEntity?.country || "Import Country") : (user?.country || parsedItem?.destination_country || 'USA'),
      hs_code: parsedItem?.hs_code_suggestion || smartCatalogItem?.hs_code || targetEntity?.hs_code || '000000',
      product_category: parsedItem?.product_category || smartCatalogItem?.category || 'General',
      product_name: parsedItem?.product_name || smartCatalogItem?.product_name || targetEntity?.product_name || 'Commodity',
      quantity: parsedItem?.quantity || smartCatalogItem?.quantity || targetEntity?.target_quantity || 1000,
      price: negotiationResult?.final_agreed_price || 5000,
      logistics_mode: 'Sea Freight', 
      delivery_terms: 'CIF',
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

  // Exporter: Autonomous Pitch Generator
  const runExporterPitch = async (buyer) => {
    setLoading(true);
    setActiveTab('outbound-quote');
    
    // Create the CIF Pitch Payload
    const payload = {
      product_name: smartCatalogItem?.product_name || buyer.product_name || "Commodity",
      quantity: Math.min(parseFloat(smartCatalogItem?.quantity || 1), parseFloat(buyer.target_quantity || 1)),
      unit: smartCatalogItem?.unit || "tons",
      hs_code: smartCatalogItem?.hs_code || "000000",
      buyer_id: buyer.buyer_id || "Unknown",
      buyer_country: buyer.country || "Germany"
    };

    try {
      const response = await fetch('http://localhost:8000/api/intelligence/generate-pitch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (response.ok) {
        setNegotiationResult({...data, buyer});
      } else {
        alert('Pitch Engine failed: ' + (data.detail || 'Unknown error'));
        setActiveTab('buyer-discovery');
      }
    } catch (error) {
      alert('Error parsing via intelligence pipeline: ' + error.message);
      setActiveTab('buyer-discovery');
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
        } else if (data.action_type === 'execute_catalog_generation') {
          setActiveTab('catalog');
          if (data.action_target) {
            setCatalogDescription(data.action_target);
            // Auto trigger backend catalog gen via Orchestrator state hook
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

  const runInspection = async () => {
    if (!parsedItem) return;
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/qc/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_name: parsedItem.product_name,
          trade_id: documentAgentResult?.trade_id || "TRD-DEMO"
        })
      });
      const data = await response.json();
      if (response.ok) {
        setQcReport(data.report);
      }
    } catch (e) {
      console.error("Inspection Agent failed", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEscrowLedger = async () => {
    try {
      const price = negotiationResult?.final_agreed_price || 0;
      const t_id = documentAgentResult?.trade_id || "TRD-DEMO";
      const response = await fetch(`http://localhost:8000/api/escrow/ledger/${t_id}?price=${price}`);
      const data = await response.json();
      if (response.ok) {
        setEscrowLedger(data);
      }
    } catch (e) {
      console.error("Escrow API failed", e);
    }
  };

  // Dynamic port states for live production usage
  const [originPort, setOriginPort] = useState("");
  const [destinationPort, setDestinationPort] = useState("");

  // Auto-fill ports dynamically when Trade Context is acquired
  useEffect(() => {
    if (user) {
      const isExporter = user.user_type === 'exporter';
      
      if (isExporter) {
        if (user.country && !originPort) {
          setOriginPort(`${user.country} Port`);
        }
        if (negotiationResult?.buyer?.country && !destinationPort) {
          setDestinationPort(`${negotiationResult.buyer.country}`);
        }
      } else {
        if (negotiationResult?.supplier?.country && !originPort) {
          setOriginPort(`${negotiationResult.supplier.country} Port`);
        }
        if (user.country && !destinationPort) {
          setDestinationPort(`${user.country} Port`);
        } else if (parsedItem?.destination_country && !destinationPort) {
          setDestinationPort(`${parsedItem.destination_country} Port`);
        }
      }
    }
  }, [negotiationResult, user, parsedItem, originPort, destinationPort]);

  // Trigger real Risk Agent backend API
  const runRiskAgent = async () => {
    setLoading(true);
    setRiskResult(null);
    try {
      const supplierName = negotiationResult?.supplier?.company_name || "Unknown";
      const supplierId = negotiationResult?.supplier?.supplier_id || "sup_001";
      const supplierCountry = originPort || parsedItem?.origin_country || negotiationResult?.supplier?.country || "China";
      const buyerCountry = destinationPort || parsedItem?.destination_country || user?.country || "India";
      
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

  // Exporter: Trigger Real Risk Agent for Buyer
  const evaluateBuyerRisk = async (buyer) => {
    setLoading(true);
    setBuyerRiskResult(null);
    try {
      const tradePayload = {
        supplier_id: user?.company_name || "Exporter HQ",
        country: originPort || user?.country || "Export Country",
        buyer_country: destinationPort || buyer.country || "Import Country",
        hs_code: smartCatalogItem?.hs_code || "000000",
        price: 1500.0, // Mock base line if no pitch generated
        payment_terms: "Advance", // Strict default to measure risk
        buyer_port: destinationPort || buyer.country || "Import Country",
        supplier_port: originPort || user?.country || "Export Port"
      };

      const res = await fetch('http://localhost:8000/api/risk/assess-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tradePayload)
      });
      
      const data = await res.json();
      if (data.status === 'success') {
        setBuyerRiskResult({
          companyName: buyer.company_name || buyer.buyer_id,
          ...data.risk_report
        });
      } else {
        alert("Risk Agent failed: " + data.detail);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Risk Agent Backend.");
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
      const destLocation = parsedItem?.destination_country || user?.country || "Mumbai";
      
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '10px 20px' , borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ fontSize: '14px', color: '#cbd5e1' }}>Viewing as:</span>
            <span style={{ 
              backgroundColor: user?.user_type === 'exporter' ? '#10b981' : '#3b82f6', 
              color: 'white', 
              padding: '4px 12px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {user?.user_type}
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px' }}>{user?.email}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
               <button onClick={resetPlatform} style={{ background: 'none', border: '1px solid #475569', color: '#cbd5e1', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>Reset Session</button>
               <button onClick={logout} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
            </div>
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
        {(user?.user_type === 'exporter' ? [
          { id: 'catalog', icon: '📦', label: 'Catalog & Inventory' },
          { id: 'buyer-discovery', icon: '🔍', label: 'Buyer Matchmaker' },
          { id: 'credit-risk', icon: '🛡️', label: 'Buyer Credit Risk' },
          { id: 'outbound-quote', icon: '✈️', label: 'Outbound Quotes' },
          { id: 'doc-generation', icon: '📄', label: 'Document Generation' }
        ] : [
          { id: 'parser', icon: '📝', label: 'Trade Parser' },
          { id: 'matchmaker', icon: '🤝', label: 'Supplier Matchmaker' },
          { id: 'negotiator', icon: '💬', label: 'Market & Negotiation Agent' },
          { id: 'document-agent', icon: '📄', label: 'Document Verification' },
          { id: 'quality-escrow', icon: '🛡️', label: 'Quality & Escrow Ledger' },
          { id: 'logistics-agent', icon: '🚢', label: 'Inbound Logistics' }
        ]).map(tab => (
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
            Supplier Matchmaker & Import Intelligence
          </h2>
          
          {/* Intelligence Section: Feasibility & Landed Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
             {feasibilityReport && (
               <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', borderLeft: '6px solid #ffc107', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>📋 Import Feasibility Report</h4>
                  <div style={{ fontSize: '14px' }}>
                    <div style={{ marginBottom: '5px' }}><strong>Status:</strong> {feasibilityReport.import_status}</div>
                    <div style={{ marginBottom: '5px' }}><strong>Compliance Checklist:</strong> {feasibilityReport.compliance_checklist.join(', ') || 'None (Standard GST)'}</div>
                    <div style={{ marginBottom: '10px', color: '#dc3545', fontWeight: 'bold' }}>Recommendation: {feasibilityReport.recommendation}</div>
                    <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
                      Risk Score: {feasibilityReport.risk_score} / 10
                    </div>
                  </div>
               </div>
             )}

             {landedCost ? (
               <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', borderLeft: '6px solid #0d6efd', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#0d6efd' }}>💰 True Landed Cost Simulator (INR)</h4>
                  <div style={{ fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>Expected Case:</span> <strong>₹{landedCost.simulations.expected_case.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#28a745' }}>
                      <span>Best Case (Optimized):</span> <strong>₹{landedCost.simulations.best_case.toLocaleString()}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: '#dc3545' }}>
                      <span>Worst Case (Delays/Fees):</span> <strong>₹{landedCost.simulations.worst_case.toLocaleString()}</strong>
                    </div>
                    <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#6c757d' }}>
                      Includes BCD ({landedCost.breakdown.basic_customs_duty}) + IGST ({landedCost.breakdown.igst}) + Est. Freight.
                    </div>
                  </div>
               </div>
             ) : (
               <div style={{ backgroundColor: '#e9ecef', padding: '20px', borderRadius: '8px', textAlign: 'center', color: '#6c757d' }}>
                  Select a supplier below to simulate Landed Cost.
               </div>
             )}
          </div>

          {/* MOQ Aggregator Section */}
          {coImportGroups.length > 0 && (
            <div style={{ marginBottom: '30px', backgroundColor: '#e7f3ff', padding: '20px', borderRadius: '10px', border: '1px solid #b8daff' }}>
               <h4 style={{ color: '#004085', margin: '0 0 15px 0' }}>📦 MOQ Aggregator: Active Hub Groups found in India</h4>
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
                  {coImportGroups.map(group => (
                    <div key={group.group_id} style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
                       <div style={{ fontWeight: 'bold', color: '#007bff' }}>{group.hub} Cluster: {group.commodity}</div>
                       <div style={{ fontSize: '12px', margin: '10px 0' }}>
                          Progress: {group.current_total} / {group.target_moq} kg <br/>
                          Participants: {group.participants} SMEs <br/>
                          Ends in: {group.days_left} days
                       </div>
                       <button 
                         onClick={() => joinGroup(group.group_id)}
                         style={{ width: '100%', backgroundColor: '#007bff', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                         Join Group (Bypass MOQ)
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
          
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

                          {/* Digital Trust & Compliance Audit */}
                          <div style={{ 
                            backgroundColor: '#f1f3f5', 
                            padding: '12px', 
                            borderRadius: '8px', 
                            fontSize: '12px', 
                            border: '1px solid #dee2e6',
                            marginBottom: '15px'
                          }}>
                            <h6 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#495057' }}>🔒 Digital Trust & Compliance Audit</h6>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <div style={{ color: supplier.kyc_verified ? '#28a745' : '#dc3545', fontWeight: 'bold', marginBottom: '3px' }}>
                                  {supplier.kyc_verified ? '✓ ISO Certified' : '✗ Certification Missing'}
                                </div>
                                <div style={{ color: '#6c757d' }}>Verified Years in Business: {supplier.years_in_business || '15+'}</div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 'bold' }}>Risk Assessment:</div>
                                <div style={{ 
                                  display: 'inline-block', 
                                  padding: '2px 8px', 
                                  borderRadius: '12px', 
                                  backgroundColor: supplier.risk_score < 3 ? '#d4edda' : '#fff3cd',
                                  color: supplier.risk_score < 3 ? '#155724' : '#856404'
                                }}>
                                  {supplier.risk_score < 3 ? 'LOW RISK' : 'MODERATE RISK'}
                                </div>
                              </div>
                            </div>
                            <div style={{ marginTop: '8px', borderTop: '1px solid #ced4da', paddingTop: '8px', color: '#155724', fontWeight: 'bold' }}>
                               AI Trust Signal: {supplier.explanation}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <button 
                              onClick={() => {
                                fetchLandedCost(supplier.avg_unit_price_usd * (parsedItem?.quantity || 1000) * 83.5, parsedItem?.hs_code_suggestion, supplier.country);
                              }} 
                              style={{ backgroundColor: '#0d6efd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>
                              Simulate Landed Cost (Landed)
                            </button>
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

      {/* Quality & Escrow Ledger Tab */}
      {activeTab === 'quality-escrow' && (
        <div style={{ border: '2px solid #20c997', borderRadius: '10px', padding: '30px', backgroundColor: '#f8f9fa' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#20c997', margin: 0 }}>Autonomous Quality Control & Financial Escrow</h2>
              <button 
                onClick={() => {
                  runInspection();
                  fetchEscrowLedger();
                }}
                disabled={loading}
                style={{ backgroundColor: '#20c997', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                {loading ? 'Agents Syncing...' : '🔄 Refresh Live Audit Data'}
              </button>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* QC Section */}
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #ced4da', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h4 style={{ color: '#495057', borderBottom: '2px solid #20c997', paddingBottom: '10px', marginBottom: '15px' }}>
                  Laboratory Inspection Report
                </h4>
                {qcReport ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <strong>Agency: {qcReport.inspector}</strong>
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>Grade {qcReport.overall_grade}</span>
                    </div>
                    <div style={{ backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>
                      {qcReport.parameters.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < qcReport.parameters.length -1 ? '1px solid #dee2e6' : 'none' }}>
                          <span style={{ fontSize: '13px' }}>{p.name}</span>
                          <span style={{ fontWeight: 'bold', fontSize: '13px', color: p.status === 'PASS' ? '#28a745' : '#dc3545' }}>{p.result} ({p.status})</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: qcReport.verdict.includes('Clear') ? '#d4edda' : '#f8d7da', borderRadius: '5px', textAlign: 'center' }}>
                       <strong style={{ color: qcReport.verdict.includes('Clear') ? '#155724' : '#721c24' }}>VERDICT: {qcReport.verdict}</strong>
                    </div>
                    <div style={{ fontSize: '10px', color: '#6c757d', marginTop: '10px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      Seal: {qcReport.digital_seal_hash}
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#6c757d', textAlign: 'center' }}>Awaiting Inspector Arrival at Origin Terminal...</p>
                )}
              </div>

              {/* Escrow Ledger Section */}
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #ced4da', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <h4 style={{ color: '#495057', borderBottom: '2px solid #0d6efd', paddingBottom: '10px', marginBottom: '15px' }}>
                  DLT Financial Ledger (Escrow)
                </h4>
                {escrowLedger ? (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                      <span><strong>Contract Address:</strong></span>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#0d6efd' }}>{escrowLedger.escrow_address.substring(0,12)}...</span>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                       {escrowLedger.milestones.map((m, i) => (
                         <div key={i} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #dee2e6', borderRadius: '5px', backgroundColor: m.status === 'RELEASED' ? '#e7f3ff' : 'transparent' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                               <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{m.name} ({m.percentage}%)</span>
                               <span style={{ fontSize: '11px', fontWeight: 'bold', color: m.status === 'RELEASED' ? '#0d6efd' : '#6c757d' }}>{m.status}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                               <span style={{ fontSize: '14px', color: '#28a745', fontWeight: 'bold' }}>₹{m.amount.toLocaleString()}</span>
                               {m.tx_hash && <span style={{ fontSize: '10px', fontFamily: 'monospace' }}>Tx: {m.tx_hash}</span>}
                            </div>
                         </div>
                       ))}
                    </div>
                    <div style={{ borderTop: '2px solid #dee2e6', paddingTop: '15px' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                          <span style={{ color: '#6c757d' }}>Total Value:</span>
                          <strong>₹{escrowLedger.total_value.toLocaleString()}</strong>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0d6efd' }}>
                          <span>Released to Supplier:</span>
                          <strong>₹{escrowLedger.total_released.toLocaleString()}</strong>
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc3545' }}>
                          <span>Remaining in Escrow:</span>
                          <strong>₹{escrowLedger.total_locked.toLocaleString()}</strong>
                       </div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#6c757d', textAlign: 'center' }}>Contract awaiting initial funding milestone...</p>
                )}
              </div>
           </div>

           {qcReport && escrowLedger && (
             <div style={{ marginTop: '30px', textAlign: 'center' }}>
                <button 
                  onClick={() => {
                    setActiveTab('logistics-agent');
                    fetchLogisticsRoutes();
                  }}
                  style={{ backgroundColor: '#6f42c1', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
                >
                  Quality Verified & Funds Secured: Proceed to Inbound Logistics ➜
                </button>
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
                        <strong>Est. Cost:</strong> ₹{(route.metrics.estimated_cost_inr || (route.metrics.estimated_cost_usd * 83.5)) ? Math.round(route.metrics.estimated_cost_inr || (route.metrics.estimated_cost_usd * 83.5)).toLocaleString('en-IN') : '0'}
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

      {/* ------------------------------------------------------------------------- */}
      {/* EXPORTER SPECIFIC WORKFLOW TABS */}
      {/* ------------------------------------------------------------------------- */}

      {/* Exporter: Catalog & Inventory Tab */}
      {activeTab === 'catalog' && (
        <div style={{ border: '2px solid #0d6efd', borderRadius: '10px', padding: '30px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ color: '#0d6efd', marginBottom: '20px' }}>Product Catalog & Inventory Engine</h2>
          <p style={{ color: '#6c757d' }}>Define what you want to sell. TradeOS AI will auto-classify HS Codes and check export compliance.</p>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6' }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Product Description</label>
              <textarea 
                value={catalogDescription}
                onChange={e => setCatalogDescription(e.target.value)}
                placeholder="e.g., High-Quality organic turmeric powder, 5 tons available..." 
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ced4da', minHeight: '80px' }}>
              </textarea>
            </div>
            <button disabled={loading} onClick={generateCatalog} style={{ backgroundColor: loading ? '#6c757d' : '#0d6efd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>
              {loading ? 'AI Parsing...' : 'Generate Smart Catalog Listing'}
            </button>

            {smartCatalogItem && (
              <div style={{ marginTop: '20px', backgroundColor: '#e9ecef', padding: '15px', borderRadius: '5px', border: '1px solid #ced4da' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0d6efd' }}>✅ Processed Catalog Item</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div><strong>Product:</strong> {smartCatalogItem.product_name}</div>
                  <div><strong>HS Code:</strong> {smartCatalogItem.hs_code}</div>
                  <div><strong>Category:</strong> {smartCatalogItem.category}</div>
                  <div><strong>Quantity:</strong> {smartCatalogItem.quantity} {smartCatalogItem.unit}</div>
                </div>
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#dc3545' }}>
                  <strong>Compliance Requirements:</strong> {smartCatalogItem.compliance_requirements?.join(', ')}
                </div>
                <button 
                  onClick={findGlobalBuyers} 
                  style={{ marginTop: '15px', width: '100%', backgroundColor: '#28a745', color: 'white', padding: '10px', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
                  Forward to Global Buyer Matchmaker ➜
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Exporter: Buyer Matchmaker Tab */}
      {activeTab === 'buyer-discovery' && (
        <div style={{ border: '2px solid #28a745', borderRadius: '10px', padding: '30px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ color: '#28a745', marginBottom: '20px' }}>Global Buyer Matchmaker</h2>
          <p style={{ color: '#6c757d' }}>AI has routed verified Global RFQs (Requests for Quotation) and matched buyers looking for your exact compliance and HS parameters.</p>
          
          {loading ? (
             <div style={{ padding: '30px', textAlign: 'center', color: '#28a745', fontWeight: 'bold' }}>Executing Semantic Retrieval and Risk-Weighted Scoring Algorithms...</div>
          ) : !exporterBuyerLeads ? (
             <div style={{ padding: '30px', textAlign: 'center', color: '#6c757d' }}>No leads yet. Create a catalog first.</div>
          ) : (
            <div style={{ backgroundColor: '#d4edda', padding: '20px', borderRadius: '8px', border: '1px solid #c3e6cb', marginTop: '20px' }}>
              <h4 style={{ color: '#155724', margin: '0 0 10px 0' }}>Top Intelligent Buyer Leads Found ({exporterBuyerLeads.length}):</h4>
              
              {exporterBuyerLeads.length === 0 && <p>No Active RFQs match your HS Code or semantic description.</p>}

              {exporterBuyerLeads.map((buyer, idx) => (
                <div key={idx} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', marginTop: '10px', border: '1px solid #28a745' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ fontSize: '18px' }}>{buyer.company_name} ({buyer.country})</strong>
                      <p style={{ margin: '5px 0' }}>Looking to import: <strong>{buyer.target_quantity} {buyer.unit}</strong> of <strong>{buyer.product_name}</strong></p>
                      <p style={{ margin: '5px 0', fontStyle: 'italic', color: '#6c757d', fontSize: '12px' }}>💡 AI Match: {buyer.match_explanation}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: buyer.match_score >= 80 ? '#28a745' : '#ffc107', marginBottom: '10px' }}>
                         {buyer.match_score}% Match
                      </div>
                      <button onClick={() => runExporterPitch(buyer)} style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s' }} onMouseOver={(e) => e.target.style.backgroundColor = '#218838'} onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}>Review Buyer & Pitch</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Exporter: Buyer Credit Risk Tab */}
      {activeTab === 'credit-risk' && (
        <div style={{ border: '2px solid #dc3545', borderRadius: '10px', padding: '30px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ color: '#dc3545', marginBottom: '20px' }}>Buyer Risk & Compliance Gatekeeper</h2>
          <p style={{ color: '#6c757d' }}>Live calculation of credit exposure, port congestion, currency volatility, and geopolitical risks.</p>
          
          {loading ? (
             <div style={{ padding: '30px', textAlign: 'center', color: '#dc3545', fontWeight: 'bold' }}>Risk Agent querying OpenWeather, AIS Port Congestion & FastForex APIS...</div>
          ) : buyerRiskResult ? (
            <div style={{
              marginTop: '20px',
              padding: '25px',
              border: `2px solid ${buyerRiskResult.risk_level === 'HIGH' ? '#dc3545' : buyerRiskResult.risk_level === 'MEDIUM' ? '#ffc107' : '#28a745'}`,
              borderRadius: '10px',
              backgroundColor: '#ffffff'
            }}>
              <h3 style={{ 
                color: buyerRiskResult.risk_level === 'HIGH' ? '#dc3545' : buyerRiskResult.risk_level === 'MEDIUM' ? '#fd7e14' : '#28a745',
                margin: '0 0 15px 0'
              }}>
                Dynamic Risk Assessment: {buyerRiskResult.companyName}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Overall Transaction Risk</h4>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: buyerRiskResult.risk_level === 'HIGH' ? '#dc3545' : buyerRiskResult.risk_level === 'MEDIUM' ? '#fd7e14' : '#28a745' }}>
                    {buyerRiskResult.risk_level} 
                    <span style={{ fontSize: '18px', color: '#6c757d', marginLeft: '10px' }}>({buyerRiskResult.risk_score} / 10)</span>
                  </div>
                  <p style={{ margin: '10px 0 0 0', fontWeight: 'bold', color: buyerRiskResult.proceed_recommended ? '#28a745' : '#dc3545' }}>
                    {buyerRiskResult.proceed_recommended ? "CLEAR FOR EXPORT" : "🚫 TRADE BLOCKED - ESCROW MANDATED"}
                  </p>
                </div>
                
                <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                  <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>5-Pillar Live Calculation</h4>
                  <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    <div><strong>Financial & Currency Volatility:</strong> {buyerRiskResult.components.financial}/10</div>
                    <div><strong>Destination Port (Congestion/Weather):</strong> {buyerRiskResult.components.logistics}/10</div>
                    <div><strong>Compliance Target Tariffs:</strong> {buyerRiskResult.components.compliance}/10</div>
                    <div><strong>Market Baseline Check:</strong> {buyerRiskResult.components.market}/10</div>
                  </div>
                </div>
              </div>
              
              <div style={{ backgroundColor: '#fff3cd', borderLeft: '4px solid #ffc107', padding: '15px', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#856404' }}>Autonomous AI Recommendations</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', color: '#856404' }}>
                  {buyerRiskResult.recommendations.map((rec, i) => (
                    <li key={i} style={{ marginBottom: '5px' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: '20px' }}>
               <h4 style={{ color: '#495057', marginBottom: '15px' }}>Select Lead to Execute Real-time APIs</h4>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                 {(exporterBuyerLeads || []).map((b, i) => (
                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', backgroundColor: 'white', borderRadius: '5px', border: '1px solid #ced4da' }}>
                      <div><strong>{b.company_name}</strong> - {b.country}</div>
                      <button onClick={() => evaluateBuyerRisk(b)} style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Run 5-Pillar Scan</button>
                   </div>
                 ))}
                 {(!exporterBuyerLeads || exporterBuyerLeads.length === 0) && (
                   <div style={{ color: '#6c757d' }}>No leads found. Return to Matchmaker.</div>
                 )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* Exporter: Outbound Quotes Tab */}
      {activeTab === 'outbound-quote' && (
        <div style={{ border: '2px solid #fd7e14', borderRadius: '10px', padding: '30px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ color: '#fd7e14', marginBottom: '20px' }}>Outbound Logistics & Quoting</h2>
          <p style={{ color: '#6c757d' }}>Generate a CIF (Cost, Insurance & Freight) quote dynamically for the buyer.</p>
          
          {loading ? (
             <div style={{ padding: '30px', textAlign: 'center', color: '#fd7e14', fontWeight: 'bold' }}>Intelligence Engine computing CIF Quote via live APIs...</div>
          ) : negotiationResult && negotiationResult.proposal ? (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #fd7e14', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                 <h4 style={{ color: '#fd7e14', margin: 0 }}>Autonomous Proposal: CIF {negotiationResult.buyer?.country || 'Destination'}</h4>
                 <div style={{ backgroundColor: '#fff3cd', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', color: '#856404', fontSize: '12px' }}>
                   Risk Gatekeeper: {negotiationResult.risk_status || 'Analyzed'}
                 </div>
              </div>
              
              <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '15px', borderLeft: '4px solid #fd7e14' }}>
                 <strong>Product:</strong> {negotiationResult.proposal.quantity} {negotiationResult.proposal.unit} of {negotiationResult.proposal.product_name} <br/>
                 <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '10px' }}>
                    (Breakdown: {negotiationResult.proposal.quantity_kg} kg @ {negotiationResult.proposal.price_per_kg} {negotiationResult.proposal.currency}/kg)
                 </div>
                 <strong>FOB Base Price (yfinance):</strong> {negotiationResult.proposal.base_price_fob.toLocaleString()} {negotiationResult.proposal.currency} <br/>
                 <strong>Est. Freight & Insurance:</strong> {negotiationResult.proposal.freight_insurance.toLocaleString()} {negotiationResult.proposal.currency} <br/>
                 <strong style={{ fontSize: '18px', color: '#dc3545', display: 'block', marginTop: '10px' }}>
                    Total CIF Offer: {negotiationResult.proposal.total_cif_quote.toLocaleString()} {negotiationResult.proposal.currency}
                 </strong>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  disabled={riskResult?.overall_risk === 'HIGH'}
                  onClick={() => {
                     if (riskResult?.overall_risk === 'HIGH') {
                       alert("BLOCKED: Cannot execute trade. Compliance Risk is too high.");
                       return;
                     }
                     alert("Quote digitally signed and dispatched to Buyer! Initializing Document execution...");
                     runDocumentAgent(negotiationResult.buyer);
                  }} 
                  style={{ 
                    flex: 1, 
                    backgroundColor: riskResult?.overall_risk === 'HIGH' ? '#dc3545' : '#fd7e14', 
                    color: 'white', 
                    border: 'none', 
                    padding: '12px 24px', 
                    borderRadius: '5px', 
                    cursor: riskResult?.overall_risk === 'HIGH' ? 'not-allowed' : 'pointer', 
                    fontWeight: 'bold' 
                  }}>
                  {riskResult?.overall_risk === 'HIGH' ? 'Blocked by Compliance Gatekeeper' : 'Send Verified Pitch ➜'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', border: '1px solid #dee2e6', marginTop: '20px', textAlign: 'center' }}>
              <h4 style={{ color: '#fd7e14' }}>Calculate Freight to Buyer</h4>
              <button disabled style={{ backgroundColor: '#e9ecef', color: '#6c757d', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: 'not-allowed', fontWeight: 'bold' }}>No Active Pitch Input</button>
            </div>
          )}
        </div>
      )}

      {/* Exporter: Document Generation Tab */}
      {activeTab === 'doc-generation' && (
        <div style={{ border: '2px solid #6f42c1', borderRadius: '10px', padding: '30px', backgroundColor: '#f8f9fa' }}>
          <h2 style={{ color: '#6f42c1', marginBottom: '20px' }}>Export Document Generation</h2>
          <p style={{ color: '#6c757d' }}>Auto-generate Commercial Invoices, Packing Lists, and Certificates of Origin.</p>
          <div style={{ backgroundColor: '#e2d9f3', padding: '20px', borderRadius: '8px', border: '1px solid #c9bdeb', marginTop: '20px', textAlign: 'center' }}>
            <h4 style={{ color: '#4a2380', margin: '0 0 15px 0' }}>Ready to Generate Export Package</h4>
            <button 
                disabled={riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH'}
                onClick={() => runDocumentAgent(negotiationResult?.buyer || {})} 
                style={{ backgroundColor: (riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH') ? '#dc3545' : '#6f42c1', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '5px', cursor: (riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH') ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {(riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH') ? 'Generation Blocked Due to Sanctions' : 'Generate & e-Sign Documents'}
            </button>
          </div>
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
