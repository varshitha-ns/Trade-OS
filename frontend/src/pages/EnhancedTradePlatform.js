import React, { useState, useEffect } from 'react';
import OCRDocumentUpload from '../components/OCRDocumentUpload';
import AadhaarVerification from '../components/AadhaarVerification';
import { documentValidationService } from '../services/documentValidationService';
import { digitalVerificationService } from '../services/digitalVerificationService';
import { useAuth } from '../context/AuthContext';
import { 
  Search, Package, ShieldCheck, FileText, Send, CheckCircle2, 
  TrendingUp, Ship, FileCheck, ShieldAlert, MessageSquare, Plus, Check, RefreshCw, Lock, Download, AlertTriangle, ArrowRight, Activity, BarChart3
} from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import '../styles/ocrUpload.css';
import '../styles/documentValidation.css';

const EnhancedTradePlatform = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState(null);
  
  // Set initial tab based on user role once user is loaded
  useEffect(() => {
    if (user && !activeTab) {
      setActiveTab('overview');
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
  const [productIntelligence, setProductIntelligence] = useState(null);
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
  const [exporterDealRoom, setExporterDealRoom] = useState(null);
  
  // Shared State for the Hybrid AI Marketplace
  const [globalVerifiedCatalog, setGlobalVerifiedCatalog] = useState(() => {
    try {
      const saved = localStorage.getItem('tradeos_global_catalog');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [
      { product_name: "Organic Turmeric Powder", image_url: "/products/turmeric.png", trade_readiness_score: 95, hs_code: "091030", origin: "India" },
      { product_name: "Wind Turbine Blades", image_url: "/products/wind_turbine.png", trade_readiness_score: 88, hs_code: "850231", origin: "Germany" },
      { product_name: "Aluminum Ingots", image_url: "/products/aluminum.png", trade_readiness_score: 92, hs_code: "760110", origin: "UAE" },
      { product_name: "Semiconductor Wafers", image_url: "/products/semiconductors.png", trade_readiness_score: 98, hs_code: "854231", origin: "Taiwan" }
    ];
  });

  useEffect(() => {
    localStorage.setItem('tradeos_global_catalog', JSON.stringify(globalVerifiedCatalog));
  }, [globalVerifiedCatalog]);
  // LangChain Orchestrator State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', content: 'Hi! I am the TradeOS LangChain Orchestrator. Tell me what you want to export or ask me for live commodity prices in plain text.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Live Dashboard Feed State
  const [liveRFQs, setLiveRFQs] = useState([
    { item: 'Turmeric Powder', loc: 'Germany', type: 'IMPORT', time: 'Just now', match: '92%' },
    { item: 'Aluminum Ingots', loc: 'UAE', type: 'IMPORT', time: '2m ago', match: '85%' },
    { item: 'Semiconductors', loc: 'India', type: 'IMPORT', time: '5m ago', match: '78%' }
  ]);
  const [intelligenceLogs, setIntelligenceLogs] = useState([
    { category: 'PRICE ALERT', text: 'Copper prices increased 7% in the last 4 hours due to supply chain disruptions in Peru.' },
    { category: 'LOGISTICS WARNING', text: 'Port congestion detected in Germany. Expected delays: 4-6 days for inbound sea freight.' },
    { category: 'RISK UPDATE', text: 'Vietnam supplier network risk score improved by 12%. Favorable conditions for sourcing.' },
    { category: 'MARKET SIGNAL', text: 'EU coffee demand trending upward. High probability for spot trading arbitrage.' }
  ]);

  useEffect(() => {
    let ws;
    if (activeTab === 'overview') {
      ws = new WebSocket('ws://localhost:8000/api/live-feed/ws');
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'live_update') {
            if (data.rfqs && data.rfqs.length > 0) {
              setLiveRFQs(prev => {
                const updated = [...data.rfqs, ...prev];
                return updated.slice(0, 5); // keep latest 5
              });
            }
            if (data.intelligence && data.intelligence.length > 0) {
              setIntelligenceLogs(prev => {
                const updated = [...data.intelligence, ...prev];
                return updated.slice(0, 6); // keep latest 6
              });
            }
          }
        } catch(e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };
      ws.onerror = (err) => console.error('WebSocket Error:', err);
    }
    
    return () => {
      if (ws) ws.close();
    };
  }, [activeTab]);

  // Parse trade description
  const parseTradeItem = async (overrideDesc = null) => {
    // We check if it's an event (from a button click) or a string
    const isEvent = overrideDesc && typeof overrideDesc === 'object' && overrideDesc.preventDefault;
    const descToParse = (!isEvent && overrideDesc) ? overrideDesc : tradeDescription;
    
    if (!descToParse || !descToParse.trim()) {
      alert('Please enter a trade description');
      return;
    }

    if (!isEvent && overrideDesc) {
      setTradeDescription(overrideDesc);
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/trade-parser/parse-item?description=${encodeURIComponent(descToParse)}`, {
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
      if (res.ok) {
        setLandedCost(data);
        window.scrollTo({ top: 150, behavior: 'smooth' });
      } else {
        alert("Landed Cost Simulation Failed: " + JSON.stringify(data));
      }
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setProductIntelligence(null);
    setSmartCatalogItem(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/catalog/analyze-image', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (response.ok && data.profile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const localImageUrl = reader.result;
          
          setProductIntelligence({
            ...data.profile,
            image_url: localImageUrl
          });
          setSmartCatalogItem({
            product_name: data.profile.product_name,
            hs_code: data.profile.hs_code,
            category: data.profile.category,
            quantity: 1000,
            unit: 'tons',
            compliance_requirements: data.profile.certifications.length > 0 ? data.profile.certifications : ['Standard Export Docs'],
            origin_country: user?.country || 'Export Country'
          });
          setCatalogDescription(data.profile.product_name);
          
          // Add to Global Marketplace for Importers to discover
          setGlobalVerifiedCatalog(prev => [{
            product_name: data.profile.product_name,
            image_url: localImageUrl,
            trade_readiness_score: data.profile.trade_readiness_score || Math.floor(Math.random() * 15) + 85, // Fallback if missing
            hs_code: data.profile.hs_code,
            origin: user?.country || 'Export Country'
          }, ...prev]);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Image Analysis Failed: ' + data.detail);
      }
    } catch (err) {
      alert('Error: ' + err.message);
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

  // Importer: Initialize Deal Room Negotiation
  const runNegotiationAgent = async (supplier) => {
    setLoading(true);
    
    const qty = parsedItem?.quantity || 1000;
    const productName = parsedItem?.product_name || supplier.company_name;
    
    try {
      // 1. Fetch live market price
      const marketRes = await fetch(`http://localhost:8000/api/intelligence/market-price?product_name=${encodeURIComponent(productName)}`);
      const marketData = await marketRes.json();
      const livePrice = marketData.market_price || 300.0;
      
      const supplierPrice = Number((livePrice * 1.05).toFixed(2));
      const suggestionPrice = Number((livePrice * 0.98).toFixed(2));

      const initialMessage = {
        sender: 'Supplier', 
        type: 'offer', 
        price: supplierPrice, 
        text: `We can supply ${qty} units of ${productName} at ₹${supplierPrice}/unit. High quality guaranteed.`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      const intelligence = {
        marketAvg: livePrice,
        risk: 'Medium',
        confidence: 60, 
        suggestion: suggestionPrice
      };
      
      const res = await fetch('http://localhost:8000/api/deal-room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           room_id: `room_${Date.now()}`,
           buyer: supplier, // Reusing backend schema
           initial_message: initialMessage,
           intelligence: intelligence
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setExporterDealRoom({
          ...data.room,
          opponent: supplier,
          currentOfferPrice: '',
          active: true
        });
        setActiveTab('importer-negotiator');
      }
    } catch(e) {
      alert('Failed to initialize live deal room.');
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

  // Global polling for active deal room
  useEffect(() => {
    let interval = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/deal-room/active');
        const data = await res.json();
        if (data.status === 'success') {
          // Update the state with the latest room data
          setExporterDealRoom(prev => ({
             ...prev,
             ...data.room,
             currentOfferPrice: prev?.currentOfferPrice || ''
          }));
        } else {
          // If room is empty or cleared, we could reset it if needed
          if (exporterDealRoom?.active && exporterDealRoom?.status === 'AGREED') {
            // Keep it visible if agreed
          } else {
            // setExporterDealRoom(null);
          }
        }
      } catch(e) {}
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Exporter: Initialize Deal Room Negotiation
  const runExporterPitch = async (buyer) => {
    setLoading(true);
    const qty = Math.min(parseFloat(smartCatalogItem?.quantity || 1), parseFloat(buyer.target_quantity || 1));
    
    try {
      // 1. Fetch live market price
      const marketRes = await fetch(`http://localhost:8000/api/intelligence/market-price?product_name=${encodeURIComponent(buyer.product_name)}`);
      const marketData = await marketRes.json();
      const livePrice = marketData.market_price || 300.0;
      
      const buyerPrice = Number((livePrice * 0.95).toFixed(2));
      const suggestionPrice = Number((livePrice * 1.02).toFixed(2));

      const initialMessage = {
        sender: 'Buyer', 
        type: 'offer', 
        price: buyerPrice, 
        text: `We are looking to secure ${qty} tons of ${buyer.product_name || 'Commodity'} at ₹${buyerPrice}/kg. Delivery within 20 days.`,
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      const intelligence = {
        marketAvg: livePrice,
        risk: 'Low',
        confidence: 65, 
        suggestion: suggestionPrice
      };
      
      const res = await fetch('http://localhost:8000/api/deal-room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           room_id: `room_${Date.now()}`,
           buyer: buyer,
           initial_message: initialMessage,
           intelligence: intelligence
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setExporterDealRoom({
          ...data.room,
          currentOfferPrice: '',
          active: true
        });
        setActiveTab('exporter-negotiator');
      }
    } catch(e) {
      alert('Failed to initialize live deal room.');
    } finally {
      setLoading(false);
    }
  };

  const handleExporterOffer = async () => {
    if (!exporterDealRoom || !exporterDealRoom.currentOfferPrice) return;
    
    const offerPrice = parseFloat(exporterDealRoom.currentOfferPrice);
    if (isNaN(offerPrice)) return;

    setExporterDealRoom(prev => ({...prev, currentOfferPrice: ''}));

    try {
       await fetch('http://localhost:8000/api/deal-room/message', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           sender: user?.user_type === 'exporter' ? 'Exporter' : 'Buyer',
           type: 'offer',
           price: offerPrice,
           text: user?.user_type === 'exporter' ? `We can supply at $${offerPrice.toFixed(2)}/kg.` : `We counter at $${offerPrice.toFixed(2)}/kg.`,
           time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
         })
       });
       // State will update on next poll
    } catch(e) {
       console.error(e);
    }
  };
  
  const handleDealAgreement = async () => {
     try {
       await fetch('http://localhost:8000/api/deal-room/action', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action: 'agree', price: exporterDealRoom.history[exporterDealRoom.history.length-1].price })
       });
     } catch(e) {}
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
    const productToInspect = parsedItem?.product_name || smartCatalogItem?.product_name;
    if (!productToInspect) {
      alert("⚠️ No product detected. You must complete Matchmaking/Catalog Generation before running Quality Control.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/qc/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product_name: productToInspect,
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
      const unitPrice = negotiationResult?.final_agreed_price || 0;
      const quantity = parsedItem?.quantity || smartCatalogItem?.quantity || 1000;
      const totalPrice = unitPrice * quantity;
      
      const t_id = documentAgentResult?.trade_id || "TRD-DEMO";
      const response = await fetch(`http://localhost:8000/api/escrow/ledger/${t_id}?price=${totalPrice}`);
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

  const getProductImage = (productName) => {
    const name = (productName || '').toLowerCase();
    // Agriculture & Raw Materials
    if (name.includes('turmeric') || name.includes('cardamom') || name.includes('cinnamon') || name.includes('clove') || name.includes('cumin') || name.includes('coriander') || name.includes('nutmeg') || name.includes('spice')) return '/products/turmeric.png';
    if (name.includes('coffee') || name.includes('palm oil') || name.includes('oil') || name.includes('quinoa') || name.includes('rice') || name.includes('sugar') || name.includes('fertilizer') || name.includes('cotton') || name.includes('urea') || name.includes('pepper')) return '/products/coffee.png';
    
    // Medical
    if (name.includes('medical') || name.includes('mask') || name.includes('antibiotic') || name.includes('aspirin') || name.includes('glove') || name.includes('amoxicillin')) return '/products/medical.png';
    
    // Chemicals (New)
    if (name.includes('solvent') || name.includes('acid') || name.includes('granule') || name.includes('chemical')) return '/products/chemicals.png';

    // Textiles & Fabrics
    if (name.includes('fabric') || name.includes('yarn') || name.includes('leather') || name.includes('bag')) return '/products/textile.png';
    
    // Industrial & Energy
    if (name.includes('solar') || name.includes('panel')) return '/products/solar.png';
    if (name.includes('wind turbine') || name.includes('blade')) return '/products/wind_turbine.png';
    if (name.includes('battery') || name.includes('lithium-ion')) return '/products/batteries.png';
    
    // Machinery & Heavy Parts
    if (name.includes('motor') || name.includes('pump') || name.includes('bearing') || name.includes('pipe') || name.includes('machinery')) return '/products/machinery.png';
    
    // Metals
    if (name.includes('aluminum') || name.includes('ingot') || name.includes('ore') || name.includes('lithium')) return '/products/aluminum.png';
    if (name.includes('copper') || name.includes('cathode') || name.includes('wire')) return '/products/copper.png';
    
    // Electronics & Tech
    if (name.includes('semiconductor') || name.includes('wafer') || name.includes('chip') || name.includes('motherboard') || name.includes('display') || name.includes('cable') || name.includes('optic')) return '/products/semiconductors.png';
    
    return null;
  };


  return (
    <div className="flex h-screen bg-white shadow-sm border border-slate-200 text-slate-100 overflow-hidden font-sans selection:bg-indigo-500/30">
      
      {/* ------------------------------------------------------------------------- */}
      {/* LEFT ENTERPRISE SIDEBAR */}
      {/* ------------------------------------------------------------------------- */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 relative z-20">
        <div>
          <div className="p-6 border-b border-slate-200/50">
            <h1 className="text-2xl font-black tracking-tighter text-slate-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Ship className="w-5 h-5 text-white" />
              </div>
              TRADE<span className="text-blue-700">OS</span>
            </h1>
            <div className="mt-4 flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
               <span className={`w-2 h-2 rounded-full animate-pulse ${user?.user_type === 'exporter' ? 'bg-emerald-400' : 'bg-blue-400'}`}></span>
               ROLE: {user?.user_type?.toUpperCase() || 'GUEST'}
            </div>
          </div>
          
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-200px)] custom-scrollbar">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4 px-3">Operations</div>
            
            {(user?.user_type === 'exporter' ? [
              { id: 'overview', icon: <TrendingUp className="w-4 h-4" />, label: 'Dashboard' },
              { id: 'catalog', icon: <Package className="w-4 h-4" />, label: 'Digital Catalog' },
              { id: 'buyer-discovery', icon: <Search className="w-4 h-4" />, label: 'RFQ Market Feed' },
              { id: 'credit-risk', icon: <ShieldAlert className="w-4 h-4" />, label: 'Risk Intelligence' },
              { id: 'outbound-quote', icon: <Send className="w-4 h-4" />, label: 'Outbound Quotes' },
              { id: 'doc-generation', icon: <FileText className="w-4 h-4" />, label: 'Document Center' },
              { id: 'quality-escrow', icon: <ShieldCheck className="w-4 h-4" />, label: 'Smart Escrow' },
              { id: 'logistics-agent', icon: <Ship className="w-4 h-4" />, label: 'Live Logistics' }
            ] : [
              { id: 'overview', icon: <TrendingUp className="w-4 h-4" />, label: 'Dashboard' },
              { id: 'parser', icon: <Package className="w-4 h-4" />, label: 'AI Marketplace' },
              { id: 'matchmaker', icon: <Search className="w-4 h-4" />, label: 'Supplier Intelligence' },
              { id: 'negotiator', icon: <MessageSquare className="w-4 h-4" />, label: 'Autonomous Agent' },
              { id: 'document-agent', icon: <FileCheck className="w-4 h-4" />, label: 'Document Validation' },
              { id: 'quality-escrow', icon: <ShieldCheck className="w-4 h-4" />, label: 'Smart Escrow' },
              { id: 'logistics-agent', icon: <Ship className="w-4 h-4" />, label: 'Live Logistics' }
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium
                  ${activeTab === tab.id 
                    ? 'bg-blue-50 text-blue-700 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
                  }
                `}
              >
                <span className={`${activeTab === tab.id ? 'text-blue-700' : 'text-slate-500'}`}>
                  {tab.icon}
                </span>
                {tab.label}
                {activeTab === tab.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(99,102,241,0.8)]"></div>}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200/50 bg-white/90 shadow-md backdrop-blur">
           <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs border border-slate-300 text-white shadow-inner">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-bold text-slate-900 truncate">{user?.email}</div>
                  <div className="text-xs text-slate-500 truncate">{user?.company_name || 'TradeOS User'}</div>
                </div>
              </div>
              
              <div className="flex flex-col items-end">
                <div className="text-[9px] font-black tracking-widest text-indigo-400 uppercase">Trust Score</div>
                <div className="text-lg font-black text-indigo-600 leading-none">{user?.trust_score || 0}<span className="text-xs text-slate-400">/100</span></div>
              </div>
           </div>
           <div className="flex gap-2">
             <button onClick={resetPlatform} className="flex-1 text-xs px-2 py-2 rounded-lg bg-slate-100 hover:bg-slate-700 text-slate-800 transition-colors border border-slate-200">
               Reset
             </button>
             <button onClick={logout} className="flex-1 text-xs px-2 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors border border-rose-500/20">
               Logout
             </button>
           </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ------------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
        
        {/* Importer: Incoming Deal Room Banner */}
        {user?.user_type === 'importer' && exporterDealRoom?.active && activeTab !== 'importer-negotiator' && (
          <div className="bg-gradient-to-r from-orange-500 to-rose-500 p-4 text-white shadow-lg flex justify-between items-center relative z-50">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg"><TrendingUp className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="font-bold text-lg leading-tight">Incoming Deal Room Request</h3>
                <p className="text-sm text-white/80">An Exporter has initiated a live negotiation with you.</p>
              </div>
            </div>
            <button 
              onClick={() => setActiveTab('importer-negotiator')}
              className="px-6 py-2 bg-white text-rose-600 font-bold rounded-lg shadow hover:shadow-lg hover:scale-105 transition-all"
            >
              Join Active Deal Room
            </button>
          </div>
        )}
        

        {/* SCROLLABLE VIEWPORT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-8 relative">
           {/* Abstract Data Mesh Background */}
           <div className="absolute inset-0 opacity-20 pointer-events-none fixed" style={{ backgroundImage: 'radial-gradient(at 40% 20%, hsla(228,100%,95%,0.8) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,95%,0.8) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,98%,0.8) 0px, transparent 50%)' }}></div>
      {/* ------------------------------------------------------------------------- */}
      {/* OVERVIEW DASHBOARD */}
      {/* ------------------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-fade-in relative z-10">
           {/* LEFT COLUMN: Map & Analytics */}
           <div className="xl:col-span-2 flex flex-col gap-6">
              
              {/* Market Intelligence Ticker */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {[
                   { label: 'Copper (Ton)', val: '₹7,08,125', trend: '+4.2%', up: true },
                   { label: 'Crude Oil (Bbl)', val: '₹6,815', trend: '-1.1%', up: false },
                   { label: 'Freight (FEU)', val: '₹3,44,450', trend: '+12%', up: true },
                   { label: 'Coffee (Ton)', val: '₹1,51,392', trend: '+0.5%', up: true }
                 ].map(m => (
                   <div key={m.label} className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-4 rounded-xl shadow-lg relative overflow-hidden group hover:border-slate-300 transition-colors">
                     <div className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1">{m.label}</div>
                     <div className="text-xl font-black text-slate-900">{m.val}</div>
                     <div className={`text-xs font-bold mt-2 ${m.up ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.up ? '▲' : '▼'} {m.trend}
                     </div>
                     <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp className="w-16 h-16 transform translate-x-4 translate-y-4" />
                     </div>
                   </div>
                 ))}
              </div>

              {/* LIVE GLOBAL TRADE MAP */}
              <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 rounded-2xl p-6 shadow-xl relative min-h-[400px] flex flex-col overflow-hidden">
                 <div className="flex justify-between items-center mb-4 relative z-10">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse "></div>
                      Global Trade Operations
                    </h3>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 rounded bg-slate-100 text-xs font-bold text-slate-600 border border-slate-200">LIVE</span>
                    </div>
                 </div>
                 
                 {/* Map Placeholder Area (Stylized 2D CSS approximation) */}
                 <div 
                    className="flex-1 rounded-xl bg-white shadow-sm border border-slate-200 relative overflow-hidden flex items-center justify-center"
                    style={{ backgroundImage: "url('/world-map.svg')", backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', opacity: 0.9 }}
                 >
                    {/* Render Dynamic Paths based on Live RFQs */}
                    <svg className="absolute inset-0 w-full h-full opacity-40" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0" />
                          <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {liveRFQs.map((rfq, idx) => {
                        // Rough global coordinates for visual flair
                        const coords = {
                          "USA": { x: 20, y: 40 }, "Germany": { x: 48, y: 30 }, "Netherlands": { x: 47, y: 28 },
                          "UAE": { x: 60, y: 45 }, "India": { x: 68, y: 48 }, "Vietnam": { x: 78, y: 52 },
                          "Singapore": { x: 77, y: 58 }, "Japan": { x: 88, y: 35 }, "South Korea": { x: 85, y: 37 },
                          "Brazil": { x: 30, y: 70 }, "China": { x: 78, y: 38 }, "Taiwan": { x: 82, y: 42 },
                          "Chile": { x: 25, y: 80 }, "Australia": { x: 85, y: 75 }
                        };
                        const target = coords[rfq.loc] || { x: Math.random() * 80 + 10, y: Math.random() * 60 + 20 };
                        const origin = { x: 50, y: 90 }; // Hub
                        
                        return (
                          <path 
                            key={`path-${idx}`}
                            d={`M ${origin.x}% ${origin.y}% Q ${origin.x}% ${target.y}% ${target.x}% ${target.y}%`} 
                            fill="none" 
                            stroke="url(#line-gradient)" 
                            strokeWidth="1.5" 
                            className="animate-[dash_15s_linear_infinite]" 
                            strokeDasharray="10 10" 
                          />
                        );
                      })}
                    </svg>
                    
                    {/* Render Dynamic Nodes based on Live RFQs */}
                    {liveRFQs.map((rfq, idx) => {
                      const coords = {
                          "USA": { x: 20, y: 40 }, "Germany": { x: 48, y: 30 }, "Netherlands": { x: 47, y: 28 },
                          "UAE": { x: 60, y: 45 }, "India": { x: 68, y: 48 }, "Vietnam": { x: 78, y: 52 },
                          "Singapore": { x: 77, y: 58 }, "Japan": { x: 88, y: 35 }, "South Korea": { x: 85, y: 37 },
                          "Brazil": { x: 30, y: 70 }, "China": { x: 78, y: 38 }, "Taiwan": { x: 82, y: 42 },
                          "Chile": { x: 25, y: 80 }, "Australia": { x: 85, y: 75 }
                      };
                      const target = coords[rfq.loc] || { x: 50, y: 50 };
                      
                      return (
                        <div key={`node-${idx}`} className="absolute group" style={{ left: `${target.x}%`, top: `${target.y}%`, transform: 'translate(-50%, -50%)' }}>
                           <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center animate-ping absolute -left-1 -top-1"></div>
                           <div className="w-3 h-3 rounded-full bg-emerald-500 relative z-10  cursor-pointer hover:scale-150 transition-transform"></div>
                           <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 text-xs px-2 py-1 rounded text-slate-800 z-20 pointer-events-none">
                             {rfq.loc}: {rfq.item}
                           </div>
                        </div>
                      );
                    })}
                    
                    {/* Weather/Risk Overlay simulation */}
                    <div className="absolute left-[40%] top-[20%] w-24 h-24 bg-rose-500/5 rounded-full blur-xl animate-pulse"></div>

                    <div className="z-10 text-slate-500 font-mono text-xs opacity-50 absolute bottom-4 right-4">
                      [TradeOS Global Map Render Engine]
                    </div>
                 </div>
              </div>

              {/* SMART RFQ MARKETPLACE FEED */}
              <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 rounded-2xl p-6 shadow-xl relative">
                 <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-700" />
                    Live Marketplace RFQs
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {liveRFQs.map((rfq, idx) => {
                      const bgImage = getProductImage(rfq.item);
                      return (
                      <div 
                        key={`${idx}-${rfq.item}`} 
                        onClick={() => {
                          const cmd = `I want to ${rfq.type.toLowerCase()} ${rfq.item} from ${rfq.loc}`;
                          setTradeDescription(cmd);
                          setActiveTab('parser');
                          parseTradeItem(cmd);
                        }}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-500/50 transition-all duration-300 overflow-hidden group cursor-pointer flex flex-col animate-fade-in"
                      >
                         <div className="h-32 bg-slate-100 relative overflow-hidden">
                           {bgImage ? (
                             <img src={bgImage} alt={rfq.item} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-200"><Package className="w-8 h-8 opacity-50" /></div>
                           )}
                           <div className="absolute top-2 left-2 bg-indigo-600/90 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur font-bold flex items-center gap-1">
                             <TrendingUp className="w-3 h-3" /> LIVE RFQ
                           </div>
                           <div className="absolute bottom-2 right-2 bg-white/90 text-slate-800 font-bold text-xs px-2 py-1 rounded shadow-sm border border-slate-200">
                             {rfq.loc}
                           </div>
                         </div>
                         <div className="p-4 flex-1 flex flex-col">
                           <h4 className="font-bold text-slate-900 mb-1 leading-tight line-clamp-2">{rfq.item}</h4>
                           <p className="text-xs text-slate-500 font-mono mb-3">{rfq.time}</p>
                           <div className="flex justify-between items-center mt-auto">
                             <div className="text-xs font-bold text-slate-500">Match Confidence</div>
                             <div className="text-sm font-black text-indigo-600">
                               {rfq.match}
                             </div>
                           </div>
                         </div>
                      </div>
                      );
                    })}
                 </div>
              </div>

           </div>

           {/* RIGHT COLUMN: AI Insights Panel */}
           <div className="flex flex-col gap-6">
              <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 rounded-2xl p-6 shadow-xl flex-1 sticky top-0">
                 <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2 border-b border-slate-200 pb-4">
                    <div className="p-1.5 bg-blue-100 rounded text-blue-700">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    AI Intelligence Stream
                 </h3>
                 
                 <div className="space-y-4">
                    {intelligenceLogs.map((log, idx) => {
                      let bgClass = "border-indigo-500";
                      let textClass = "text-blue-700";
                      let dotClass = "bg-indigo-500";
                      let Icon = TrendingUp;
                      
                      if (log.category === 'PRICE ALERT') { 
                        bgClass = 'border-rose-500'; textClass = 'text-rose-400'; dotClass = 'bg-rose-500'; Icon = AlertTriangle; 
                      } else if (log.category === 'LOGISTICS WARNING') { 
                        bgClass = 'border-amber-500'; textClass = 'text-amber-400'; dotClass = 'bg-amber-500'; Icon = AlertTriangle; 
                      } else if (log.category === 'RISK UPDATE') { 
                        bgClass = 'border-emerald-500'; textClass = 'text-emerald-400'; dotClass = 'bg-emerald-500'; Icon = CheckCircle2; 
                      }
                      
                      return (
                        <div key={`${idx}-${log.category}`} className={`p-4 rounded-xl bg-white shadow-sm border border-slate-200 border-l-2 ${bgClass} border-y border-r border-slate-200 relative overflow-hidden group animate-fade-in`}>
                           <div className="absolute top-0 right-0 p-2 opacity-10"><Icon className="w-8 h-8" /></div>
                           <div className={`text-xs font-bold ${textClass} mb-1 flex items-center gap-2`}><span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>{log.category}</div>
                           <div className="text-sm text-slate-800">{log.text}</div>
                        </div>
                      );
                    })}
                 </div>

                 <button className="w-full mt-6 py-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-slate-100 transition-colors">
                   View Full Intelligence Log
                 </button>
              </div>
           </div>
        </div>
      )}
      {/* AI Marketplace / Trade Parser Tab */}
      {activeTab === 'parser' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl flex flex-col h-full">
          {/* Decorative background blur */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3 relative z-10 flex-shrink-0">
            <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-600 border border-cyan-500/30">
              <Package className="w-6 h-6" />
            </div>
            AI Sourcing Marketplace
          </h2>
          
          {/* Smart Sourcing Bar */}
          <div className="mb-8 relative z-10 bg-white p-5 rounded-2xl border border-cyan-500/30 shadow-sm flex-shrink-0">
            <label className="block mb-3 text-xs uppercase tracking-wider font-bold text-slate-500">
              AI Sourcing Agent (Type any requirement):
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              <textarea
                value={tradeDescription}
                onChange={(e) => setTradeDescription(e.target.value)}
                className="flex-1 h-24 p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all shadow-inner text-slate-800 text-sm resize-none"
                placeholder="Example: I want to import 5000 kg of organic turmeric powder from India to Germany within 30 days..."
              />
              <button
                onClick={parseTradeItem}
                disabled={loading}
                className={`
                  w-full md:w-48 flex flex-col items-center justify-center rounded-xl font-bold transition-all duration-300 border py-4 md:py-0
                  ${loading 
                    ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500 shadow-none' 
                    : 'bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-500/50 text-cyan-700 hover:text-cyan-800 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  }
                `}
              >
                {loading ? (
                  <RefreshCw className="w-6 h-6 animate-spin mb-2" />
                ) : <Search className="w-6 h-6 mb-2" />}
                {loading ? 'Searching...' : 'Source Now'}
              </button>
            </div>
          </div>
          
          {/* Visual Marketplace Grid */}
          {!parsedItem && !loading && (
            <div className="relative z-10 animate-fade-in flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-6 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                Global AI-Verified Catalog
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-8">
                {globalVerifiedCatalog.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:border-cyan-500/50 hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col">
                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400"><Package className="w-10 h-10" /></div>
                      )}
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> AI VERIFIED
                      </div>
                      <div className="absolute bottom-2 right-2 bg-white/90 text-slate-800 font-bold text-xs px-2 py-1 rounded shadow-sm border border-slate-200">
                        {item.origin}
                      </div>
                    </div>
                    
                    <div className="p-4 flex-1 flex flex-col">
                      <h4 className="font-bold text-slate-900 mb-1 leading-tight line-clamp-2">{item.product_name}</h4>
                      <p className="text-xs text-slate-500 font-mono mb-3">HS: {item.hs_code}</p>
                      
                      <div className="flex justify-between items-center mb-4 mt-auto">
                        <div className="text-xs font-bold text-slate-500">Readiness</div>
                        <div className={`text-sm font-black ${item.trade_readiness_score >= 90 ? 'text-emerald-500' : 'text-cyan-600'}`}>
                          {item.trade_readiness_score}/100
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          const cmd = `I want to import ${item.product_name} from ${item.origin}`;
                          setTradeDescription(cmd);
                          parseTradeItem(cmd);
                        }}
                        className="w-full bg-slate-50 hover:bg-cyan-50 text-cyan-700 border border-slate-200 hover:border-cyan-300 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        Source Item <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedItem && (
            <div className="mt-8 p-6 bg-white shadow-sm border border-slate-200 rounded-2xl border border-cyan-500/30 shadow-sm relative z-10 animate-fade-in">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
                <h4 className="text-cyan-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-cyan-500" />
                  Structured Trade Data Output
                </h4>
                <div className="px-3 py-1 bg-cyan-500/10 rounded-full text-xs font-bold text-cyan-400 border border-cyan-500/20">
                  Confidence: {Math.round(parsedItem.confidence_score * 100)}%
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-slate-800">
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Product</span> <strong className="text-slate-900">{parsedItem.product_name}</strong></div>
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Category</span> <strong className="text-slate-900">{parsedItem.product_category}</strong></div>
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Quantity</span> <strong className="text-slate-900">{parsedItem.quantity} {parsedItem.unit}</strong></div>
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">HS Code</span> <strong className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-mono">{parsedItem.hs_code_suggestion}</strong></div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Origin</span> <strong className="text-slate-900">{parsedItem.origin_country || "Not specified"}</strong></div>
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Destination</span> <strong className="text-slate-900">{parsedItem.destination_country || "Not specified"}</strong></div>
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Quality</span> <strong className="text-slate-900 truncate max-w-[150px]" title={parsedItem.quality_requirements.join(', ')}>{parsedItem.quality_requirements.join(', ')}</strong></div>
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Certs</span> <strong className="text-slate-900 truncate max-w-[150px]" title={parsedItem.certifications_required.join(', ')}>{parsedItem.certifications_required.join(', ')}</strong></div>
                </div>
              </div>
              
              <button
                onClick={() => setActiveTab('matchmaker')}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-700 text-slate-800 hover:text-blue-700 border border-slate-200 font-bold px-6 py-3 rounded-xl transition-all"
              >
                Proceed to Intelligence Matchmaker <Search className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Matchmaker Tab */}
      {activeTab === 'matchmaker' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <h2 className="text-2xl font-black text-slate-100 mb-6 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
              <Search className="w-6 h-6" />
            </div>
            Supplier Matchmaker & Intelligence
          </h2>
          
          {/* Intelligence Section: Feasibility & Landed Cost */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 relative z-10">
             {feasibilityReport && (
               <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border-l-4 border-l-amber-500 border-y border-r border-slate-200 shadow-sm">
                  <h4 className="text-amber-500 font-bold mb-3 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" /> Import Feasibility Report
                  </h4>
                  <div className="text-sm text-slate-800 space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Status:</span> <strong className="text-slate-900">{feasibilityReport.import_status}</strong></div>
                    <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">Checklist:</span> <strong className="text-right truncate max-w-[200px] text-slate-900">{feasibilityReport.compliance_checklist.join(', ') || 'None (Standard GST)'}</strong></div>
                    <div className="text-rose-400 font-bold mt-2 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">Recommendation: {feasibilityReport.recommendation}</div>
                    <div className="mt-3 bg-amber-500/10 text-amber-400 p-2 rounded-lg text-xs font-semibold flex justify-between border border-amber-500/20">
                      Risk Score: <span>{feasibilityReport.risk_score} / 10</span>
                    </div>
                  </div>
               </div>
             )}

             {landedCost ? (
               <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border-l-4 border-l-blue-500 border-y border-r border-slate-200 shadow-sm">
                  <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" /> True Landed Cost Simulator (INR)
                  </h4>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between border-b border-slate-200 pb-1">
                      <span className="text-slate-600">Expected Case:</span> <strong className="text-slate-900">₹{landedCost.simulations.expected_case.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1 text-emerald-400">
                      <span>Best Case (Optimized):</span> <strong>₹{landedCost.simulations.best_case.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-200 pb-1 text-rose-400">
                      <span>Worst Case (Delays/Fees):</span> <strong>₹{landedCost.simulations.worst_case.toLocaleString()}</strong>
                    </div>
                    <div className="text-xs italic text-slate-500 mt-2 bg-white p-2 rounded border border-slate-200">
                      Includes BCD ({landedCost.breakdown.basic_customs_duty}) + IGST ({landedCost.breakdown.igst}) + Est. Freight.
                    </div>
                  </div>
               </div>
             ) : (
               <div className="flex items-center justify-center bg-white shadow-sm border border-slate-200/50 p-6 rounded-2xl text-slate-500 text-sm italic border border-dashed border-slate-200">
                  Select a supplier below to simulate Landed Cost.
               </div>
             )}
          </div>

          {/* MOQ Aggregator Section */}
          {coImportGroups.length > 0 && (
            <div className="mb-8 bg-blue-900/10 p-6 rounded-2xl border border-blue-500/20 relative z-10">
               <h4 className="text-blue-400 font-bold mb-4 flex items-center gap-2">
                 <Package className="w-5 h-5" /> MOQ Aggregator: Active Hub Groups found in India
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {coImportGroups.map(group => (
                    <div key={group.group_id} className="bg-white shadow-sm border border-slate-200 p-5 rounded-xl border border-blue-500/20 shadow-sm hover:border-blue-500/50 transition-colors">
                       <div className="font-bold text-blue-400 mb-2 truncate">{group.hub} Cluster: {group.commodity}</div>
                       <div className="text-xs text-slate-600 space-y-1 mb-4">
                          <div className="flex justify-between"><span>Progress:</span> <strong className="text-slate-900">{group.current_total} / {group.target_moq} kg</strong></div>
                          <div className="flex justify-between"><span>Participants:</span> <strong className="text-slate-900">{group.participants} SMEs</strong></div>
                          <div className="flex justify-between"><span>Ends in:</span> <strong className="text-amber-400">{group.days_left} days</strong></div>
                       </div>
                       <button 
                         onClick={() => joinGroup(group.group_id)}
                         className="w-full bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/50 text-blue-400 hover:text-blue-300 py-2 rounded-lg text-sm font-bold transition-colors">
                         Join Group (Bypass MOQ)
                       </button>
                    </div>
                  ))}
               </div>
            </div>
          )}
          
          {!parsedItem ? (
            <div className="text-center py-12 relative z-10">
              <div className="inline-block p-4 bg-slate-100 rounded-full mb-4 text-slate-500">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-slate-600 mb-6 font-medium">
                Please parse a trade item first in the Trade Parser tab
              </p>
              <button
                onClick={() => setActiveTab('parser')}
                className="bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-400 font-bold px-6 py-2 rounded-xl transition-colors shadow-lg shadow-cyan-500/10"
              >
                Go to Trade Parser
              </button>
            </div>
          ) : (
            <div className="relative z-10">
              <div className="p-6 bg-white shadow-sm border border-slate-200 rounded-2xl mb-6 border border-emerald-500/30 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
                <div>
                  <h4 className="font-bold text-emerald-400 text-lg mb-1">Ready to Match: {parsedItem.product_name}</h4>
                  <p className="text-emerald-500/70 text-sm">Qty: {parsedItem.quantity} {parsedItem.unit} • Dest: {parsedItem.destination_country}</p>
                </div>
                <button
                  onClick={runMatchmaker}
                  disabled={loading}
                  className={`
                    px-8 py-3 rounded-xl font-bold shadow-lg transition-all duration-300 flex items-center gap-2 border
                    ${loading 
                      ? 'bg-slate-100 border-slate-200 cursor-not-allowed text-slate-500 shadow-none' 
                      : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/50 text-emerald-400 hover:text-emerald-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    }
                  `}
                >
                  {loading ? <><RefreshCw className="w-5 h-5 animate-spin" /> AI Working...</> : <><Search className="w-5 h-5" /> Run Matchmaker Agent</>}
                </button>
              </div>
              
              {matchmakerResults && (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xl animate-fade-in">
                  <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-4">
                    <h4 className="text-xl font-bold text-emerald-500">AI Matchmaker Recommendations</h4>
                    <div className="flex items-center gap-3 text-xs">
                      <span className={`px-2 py-1 rounded-full font-bold border ${matchmakerResults.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {matchmakerResults.success ? 'Success' : 'Failed'}
                      </span>
                      <span className="text-slate-500 font-mono">{matchmakerResults.processing_time_ms}ms</span>
                    </div>
                  </div>
                  
                  {matchmakerResults.filter_report && (
                    <div className="text-xs text-slate-600 mb-6 bg-white shadow-sm border border-slate-200 p-4 rounded-xl border border-slate-200">
                      <p className="font-semibold mb-2 text-slate-800">Filtered {matchmakerResults.filter_report.initial_count} suppliers. {matchmakerResults.filter_report.final_count} eligible.</p>
                      {matchmakerResults.filter_report.filter_breakdown && (
                        <div className="flex flex-wrap gap-3">
                          <span className="px-2 py-1 bg-white rounded border border-slate-200">Risk: {matchmakerResults.filter_report.filter_breakdown.after_risk}</span>
                          <span className="px-2 py-1 bg-white rounded border border-slate-200">HS: {matchmakerResults.filter_report.filter_breakdown.after_hs}</span>
                          <span className="px-2 py-1 bg-white rounded border border-slate-200">Capacity: {matchmakerResults.filter_report.filter_breakdown.after_capacity}</span>
                          <span className="px-2 py-1 bg-white rounded border border-slate-200">Dest: {matchmakerResults.filter_report.filter_breakdown.after_destination}</span>
                        </div>
                      )}
                      {matchmakerResults.filter_report.destination_filter_fallback && (
                        <div className="mt-2 text-amber-500 flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" /> Destination filter fallback used (no exact import-partner matches).
                        </div>
                      )}
                    </div>
                  )}
                  
                  {matchmakerResults.recommendations && (
                    <div className="space-y-6">
                      <h5 className="font-bold text-slate-800">Top Ranked Suppliers:</h5>
                      {matchmakerResults.recommendations.map((supplier, index) => (
                        <div key={supplier.supplier_id} className="relative bg-white shadow-sm border border-slate-200 border border-slate-200 rounded-2xl p-6 hover:border-emerald-500/50 transition-all duration-300 overflow-hidden group">
                          {/* Rank indicator */}
                          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-bl-full -mr-4 -mt-4 z-0 flex items-start justify-end pt-5 pr-5">
                            <span className="text-2xl font-black text-emerald-500/50 group-hover:text-emerald-400 transition-colors">#{index + 1}</span>
                          </div>
                          
                          <div className="relative z-10">
                            <div className="flex flex-col md:flex-row gap-6 mb-6">
                              {(getProductImage(parsedItem?.product_name) || getProductImage(supplier.commodity_name) || getProductImage(supplier.company_name)) && (
                                <div className="w-full md:w-1/3 h-40 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group shrink-0">
                                  <img src={getProductImage(parsedItem?.product_name) || getProductImage(supplier.commodity_name) || getProductImage(supplier.company_name)} alt="Product" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                  <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" /> AI VERIFIED
                                  </div>
                                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
                                     <div className="text-white text-xs font-bold flex justify-between items-end">
                                        <span>Quality Score:</span>
                                        <span className="text-emerald-400 text-lg">95/100</span>
                                     </div>
                                  </div>
                                </div>
                              )}
                              
                              <div className="flex-1">
                                <h6 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-3">
                                  {supplier.company_name} 
                                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">
                                    {supplier.country}
                                  </span>
                                </h6>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                      <span className="text-emerald-800 font-bold">Match Score</span> 
                                      <span className="text-emerald-600 font-black text-lg">{Math.round(supplier.final_score * 100)}%</span>
                                    </div>
                                    <div className="flex justify-between items-center p-2">
                                      <span className="text-slate-600">Success Rate</span> 
                                      <span className="font-semibold text-slate-900">{Math.round(supplier.success_rate * 100)}%</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between items-center p-2">
                                      <span className="text-slate-600">Verification</span> 
                                      <span className="font-semibold flex items-center gap-1">
                                        {supplier.aadhaar_verified && <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs">Aadhaar</span>}
                                        {supplier.kyc_verified && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-indigo-500/20 rounded text-xs">KYC</span>}
                                        {!supplier.aadhaar_verified && !supplier.kyc_verified && <span className="text-slate-500">Unverified</span>}
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                                      <span className="text-slate-600">Rating</span> 
                                      <span className="font-semibold text-amber-400">⭐ {supplier.rating}/5</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Digital Trust & Compliance Audit */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6">
                              <h6 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Digital Trust & Compliance Audit
                              </h6>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <div className={`font-bold mb-1 ${supplier.kyc_verified ? 'text-emerald-400' : 'text-rose-500'}`}>
                                    {supplier.kyc_verified ? '✓ ISO Certified' : '✗ Certification Missing'}
                                  </div>
                                  <div className="text-slate-500">Verified Years in Business: <span className="text-slate-800">{supplier.years_in_business || '15+'}</span></div>
                                </div>
                                <div className="md:text-right">
                                  <div className="font-semibold text-slate-500 mb-1">Risk Assessment</div>
                                  <div className={`inline-block px-3 py-1 rounded-full font-bold border ${supplier.risk_score < 3 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                    {supplier.risk_score < 3 ? 'LOW RISK' : 'MODERATE RISK'}
                                  </div>
                                </div>
                              </div>
                              <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-emerald-500/70 font-medium">
                                 <strong className="text-emerald-400">AI Trust Signal:</strong> {supplier.explanation}
                              </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                              <button 
                                onClick={() => fetchLandedCost(supplier.avg_unit_price_usd * (parsedItem?.quantity || 1000) * 83.5, parsedItem?.hs_code_suggestion, supplier.country)} 
                                className="flex-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/50 font-bold py-2.5 rounded-xl transition-colors text-sm"
                              >
                                Simulate Landed Cost
                              </button>
                              <button
                                onClick={() => runNegotiationAgent(supplier)}
                                className="flex-1 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 hover:border-amber-500/50 text-amber-400 font-bold py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all text-sm flex items-center justify-center gap-2"
                              >
                                Proceed to Negotiation <TrendingUp className="w-4 h-4" />
                              </button>
                            </div>
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


      {/* Document Agent Tab */}
      {activeTab === 'document-agent' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-6 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400 border border-violet-500/30">
              <FileCheck className="w-6 h-6" />
            </div>
            Autonomous Document Agent
          </h2>
          
          {loading ? (
            <div className="text-center py-16 relative z-10">
              <div className="inline-block p-4 bg-violet-500/10 border border-violet-500/20 rounded-full mb-6">
                <RefreshCw className="w-10 h-10 text-violet-500 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Agent is working...</h3>
              <p className="text-slate-600 max-w-md mx-auto">
                Analyzing trade context, checking supplier compliance in MongoDB, requesting missing certs, and drafting trade/logistics contracts.
              </p>
            </div>
          ) : !documentAgentResult ? (
            <div className="text-center py-12 relative z-10">
              <div className="inline-block p-4 bg-slate-100 rounded-full mb-4 text-slate-500">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-slate-600 mb-6 font-medium">
                Please select a supplier from the Matchmaker Agent tab to initiate autonomous trade documentation.
              </p>
              <button
                onClick={() => setActiveTab('matchmaker')}
                className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 font-bold px-6 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
              >
                Go to Matchmaker
              </button>
            </div>
          ) : (
            <div className="relative z-10">
              <div className="bg-white shadow-sm border border-slate-200 p-6 border-l-4 border-l-violet-500 border-y border-r border-slate-200 rounded-2xl mb-8 shadow-sm">
                <h4 className="text-violet-400 font-bold text-lg flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5" /> Trade Package Built Successfully!
                </h4>
                <div className="flex gap-6 text-sm">
                  <p><span className="text-slate-500">Package ID:</span> <strong className="text-slate-900 font-mono">{documentAgentResult.trade_id}</strong></p>
                  <p><span className="text-slate-500">Status:</span> <span className="font-bold text-emerald-400 border border-emerald-500/30 px-2 py-0.5 bg-emerald-500/10 rounded">{documentAgentResult.status}</span></p>
                </div>
              </div>

              <h4 className="text-slate-800 font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-500" /> Generated & Validated Documents
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {documentAgentResult.documents.map((doc, index) => (
                  <div key={doc.document_id} className="bg-white shadow-sm border border-slate-200 border border-slate-200 rounded-2xl p-5 hover:border-violet-500/50 transition-all duration-300 flex flex-col h-full group">
                    <div className="flex justify-between items-start mb-4">
                      <h5 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                        {doc.document_type.includes('Certificate') ? '🔖' : '📄'} 
                        {doc.document_type}
                      </h5>
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                        doc.status === 'Validated' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-violet-500/10 text-violet-400 border-violet-500/30'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    
                    <div className="text-xs text-slate-500 mb-4 bg-white border border-slate-200 p-2 rounded-lg font-mono">
                      ID: {doc.document_id} <br/> Created: {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                    
                    {doc.file_url ? (
                      <div className="mt-auto pt-4 space-y-4">
                        <div className="bg-white border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-400 font-mono break-all">
                          <strong className="text-emerald-500 block mb-1">e-Signature Hash:</strong>
                          {doc.metadata.digital_signature || "Pending computation..."}
                        </div>
                        
                        <a 
                          href={`http://localhost:8000${doc.file_url}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="block w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-400 text-center py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" /> Download Draft PDF (Pending e-Sign)
                        </a>
                      </div>
                    ) : (
                      <div className="mt-auto bg-white p-4 rounded-xl text-xs font-mono text-slate-600 border border-slate-200 space-y-2">
                        {Object.entries(doc.metadata).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <strong className="text-slate-500 capitalize mb-0.5">{key.replace(/_/g, ' ')}:</strong> 
                            <span className="text-slate-800">{value.toString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="bg-white shadow-sm border border-slate-200 border border-slate-200 p-6 rounded-2xl shadow-sm text-center">
                <h4 className="text-slate-800 font-bold mb-6 flex items-center justify-center gap-2">
                  <Ship className="w-5 h-5 text-blue-700" /> Define Real-Time Logistics Route
                </h4>
                <div className="flex flex-col md:flex-row gap-6 justify-center mb-6 max-w-2xl mx-auto">
                  <div className="text-left flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                      Origin / Exporter Port
                    </label>
                    <input 
                      type="text" 
                      value={originPort}
                      onChange={(e) => setOriginPort(e.target.value)}
                      placeholder="e.g. Shanghai Port"
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:bg-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner text-slate-800"
                    />
                  </div>
                  <div className="hidden md:flex items-center justify-center pt-6 text-slate-600">
                    <ArrowRight className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                      Destination / Importer Port
                    </label>
                    <input 
                      type="text" 
                      value={destinationPort}
                      onChange={(e) => setDestinationPort(e.target.value)}
                      placeholder="e.g. Mumbai Port"
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:bg-slate-100 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner text-slate-800"
                    />
                  </div>
                </div>
                
                <button
                  disabled={loading}
                  className={`
                    w-full max-w-xl mx-auto py-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 border
                    ${loading 
                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed shadow-none' 
                      : 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-500/50 text-rose-400 hover:text-rose-300 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                    }
                  `}
                  onClick={runRiskAgent}
                >
                  {loading ? <><RefreshCw className="w-5 h-5 animate-spin" /> Risk Agent Analyzing Live Datastreams...</> : <><ShieldAlert className="w-5 h-5" /> Forward Package to Risk Agent</>}
                </button>
              </div>
              
              {/* Visual Risk Agent Report Display */}
              {riskResult && (
                <div className={`mt-8 p-8 rounded-3xl bg-white shadow-sm border border-slate-200 border shadow-xl ${
                  riskResult.risk_level === 'HIGH' ? 'border-rose-500/50' : 
                  riskResult.risk_level === 'MEDIUM' ? 'border-amber-500/50' : 'border-emerald-500/50'
                }`}>
                  <h3 className={`text-2xl font-black mb-6 flex items-center gap-3 ${
                    riskResult.risk_level === 'HIGH' ? 'text-rose-500' : 
                    riskResult.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                  }`}>
                    <AlertTriangle className="w-8 h-8" />
                    Master Risk Report: {riskResult.supplierName}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center flex flex-col justify-center">
                      <h4 className="text-slate-500 font-bold uppercase tracking-wide text-xs mb-2">Overall Risk Status</h4>
                      <div className={`text-5xl font-black mb-2 ${
                        riskResult.risk_level === 'HIGH' ? 'text-rose-500' : 
                        riskResult.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                      }`}>
                        {riskResult.risk_level}
                      </div>
                      <div className="text-slate-600 font-bold text-lg mb-4">({riskResult.risk_score} / 10)</div>
                      <div className={`inline-block px-4 py-2 rounded-xl font-black text-sm border ${
                        riskResult.proceed_recommended ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {riskResult.proceed_recommended ? "✓ CLEAR TO SHIP" : "🚫 TRADE BLOCKED - ESCROW MANDATED"}
                      </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl border border-slate-200">
                      <h4 className="text-slate-500 font-bold uppercase tracking-wide text-xs mb-4">5-Pillar Breakdown</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center"><span className="text-slate-600">Supplier Capacity Risk</span> <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded shadow-sm">{riskResult.components.supplier}/10</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600">Financial & FX Risk</span> <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded shadow-sm">{riskResult.components.financial}/10</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600">Logistics (OSRM/Weather)</span> <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded shadow-sm">{riskResult.components.logistics}/10</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600">Compliance & Tariffs</span> <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded shadow-sm">{riskResult.components.compliance}/10</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-600">Market Deviation Risk</span> <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded shadow-sm">{riskResult.components.market}/10</span></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-2xl mb-8">
                    <h4 className="text-amber-400 font-bold mb-3 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5" /> AI Recommendations & Actions
                    </h4>
                    <ul className="space-y-2">
                      {riskResult.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-amber-500/80 text-sm">
                          <span className="text-amber-500 mt-0.5">•</span> {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Transition to Logistics Button */}
                  {riskResult.proceed_recommended && (
                    <div className="text-center">
                      <button
                        onClick={() => {
                          setActiveTab('logistics-agent');
                          fetchLogisticsRoutes();
                        }}
                        className="bg-blue-700/20 hover:bg-blue-700/30 border border-indigo-500/50 text-blue-700 hover:text-indigo-300 px-8 py-4 rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 mx-auto"
                      >
                        Risk Cleared: Analyze Multi-Modal Logistics Routes <ArrowRight className="w-5 h-5" />
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
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
           <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h2 className="text-2xl font-black text-slate-100 flex items-center gap-3">
                <div className="p-2 bg-teal-500/20 rounded-lg text-teal-400 border border-teal-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                Autonomous Quality Control & Financial Escrow
              </h2>
              <button 
                onClick={() => {
                  runInspection();
                  fetchEscrowLedger();
                }}
                disabled={loading}
                className="bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/50 text-teal-400 font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-teal-500/10 transition-all flex items-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                {loading ? 'Agents Syncing...' : 'Refresh Live Audit Data'}
              </button>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
              {/* QC Section */}
              <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border-l-4 border-l-teal-500 border-y border-r border-slate-200 shadow-sm hover:border-teal-500/50 transition-colors">
                <h4 className="text-teal-500 font-bold border-b border-slate-200 pb-3 mb-5 flex items-center gap-2">
                  Laboratory Inspection Report
                </h4>
                {qcReport ? (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                      <strong className="text-slate-900">Agency: {qcReport.inspector}</strong>
                      <span className="px-3 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/30 rounded-full font-bold text-sm">Grade {qcReport.overall_grade}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 mb-4">
                      {qcReport.parameters.map((p, i) => (
                        <div key={i} className={`flex justify-between items-center pb-3 ${i < qcReport.parameters.length - 1 ? 'border-b border-slate-200' : ''}`}>
                          <span className="text-sm text-slate-600 font-medium">{p.name}</span>
                          <span className={`text-sm font-bold flex items-center gap-1 ${p.status === 'PASS' ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {p.result} 
                            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${p.status === 'PASS' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>{p.status}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-4 p-4 rounded-xl text-center font-bold text-sm shadow-sm border ${qcReport.verdict.includes('Clear') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                       VERDICT: {qcReport.verdict}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-4 font-mono break-all bg-white p-2 rounded-lg border border-slate-200">
                      <strong className="text-slate-600">Digital Seal:</strong> {qcReport.digital_seal_hash}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 italic text-sm">
                    Awaiting Inspector Arrival at Origin Terminal...
                  </div>
                )}
              </div>

              {/* Escrow Ledger Section */}
              <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border-l-4 border-l-blue-500 border-y border-r border-slate-200 shadow-sm hover:border-blue-500/50 transition-colors">
                <h4 className="text-blue-500 font-bold border-b border-slate-200 pb-3 mb-5 flex items-center gap-2">
                  DLT Financial Ledger (Escrow)
                </h4>
                {escrowLedger ? (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-6 bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-sm font-medium text-slate-600">Contract Address:</span>
                      <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 border border-blue-500/30 px-2 py-1 rounded">{escrowLedger.escrow_address.substring(0,16)}...</span>
                    </div>
                    <div className="space-y-3 mb-6">
                       {escrowLedger.milestones.map((m, i) => (
                         <div key={i} className={`p-4 border rounded-xl transition-colors ${m.status === 'RELEASED' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-2">
                               <span className="font-bold text-sm text-slate-900">{m.name} <span className="text-slate-500 font-normal">({m.percentage}%)</span></span>
                               <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border ${m.status === 'RELEASED' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{m.status}</span>
                            </div>
                            <div className="flex justify-between items-end">
                               <span className="text-lg text-emerald-400 font-black tracking-tight">₹{m.amount.toLocaleString()}</span>
                               {m.tx_hash && <span className="text-[10px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Tx: {m.tx_hash}</span>}
                            </div>
                         </div>
                       ))}
                    </div>
                    <div className="border-t border-slate-200 pt-5 space-y-2 text-sm">
                       <div className="flex justify-between items-center">
                          <span className="text-slate-600 font-medium">Total Value:</span>
                          <strong className="text-slate-900">₹{escrowLedger.total_value.toLocaleString()}</strong>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-medium">Released to Supplier:</span>
                          <strong className="text-blue-300">₹{escrowLedger.total_released.toLocaleString()}</strong>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-rose-500 font-medium">Remaining in Escrow:</span>
                          <strong className="text-rose-400">₹{escrowLedger.total_locked.toLocaleString()}</strong>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-dashed border-slate-200 text-slate-500 italic text-sm">
                    Contract awaiting initial funding milestone...
                  </div>
                )}
              </div>
           </div>

           {qcReport && escrowLedger && (
             <div className="mt-8 text-center relative z-10">
                <button 
                  onClick={() => {
                    setActiveTab('logistics-agent');
                    fetchLogisticsRoutes();
                  }}
                  className="bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/50 text-violet-400 hover:text-violet-300 font-bold py-4 px-8 rounded-xl shadow-[0_0_15px_rgba(139,92,246,0.2)] hover:shadow-[0_0_25px_rgba(139,92,246,0.4)] hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mx-auto"
                >
                  Quality Verified & Funds Secured: Proceed to Inbound Logistics <ArrowRight className="w-5 h-5" />
                </button>
             </div>
           )}
        </div>
      )}

      {/* Logistics & Tracking Tab */}
      {activeTab === 'logistics-agent' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 -ml-20 -mt-20 w-64 h-64 bg-blue-50 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-6 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-700 border border-indigo-500/30">
              <Ship className="w-6 h-6" />
            </div>
            Autonomous Logistics Routing & Tracking
          </h2>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 bg-white shadow-sm border border-slate-200 p-5 rounded-2xl border border-slate-200 shadow-sm relative z-10">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Origin</span>
                <div className="font-bold text-slate-900">{originPort || 'Auto-selected'}</div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-600" />
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Destination</span>
                <div className="font-bold text-slate-900">{destinationPort || 'Auto-selected'}</div>
              </div>
            </div>
            <button 
              onClick={fetchLogisticsRoutes} 
              className="bg-blue-700/20 text-blue-700 hover:bg-blue-700/30 hover:text-indigo-300 font-bold py-2.5 px-5 rounded-xl border border-indigo-500/50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Rescan Live Shipping Lanes
            </button>
          </div>

          {!logisticsRoutes && !loading && (
            <div className="text-center py-12 relative z-10 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-500 font-medium">
              Click the button above to pull live Satellite & Carrier rates.
            </div>
          )}

          {loading && (
            <div className="text-center py-16 relative z-10">
              <div className="inline-block p-4 bg-blue-50 border border-indigo-500/20 rounded-full mb-6">
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Analyzing Sea, Air, and Land Tradeoffs...</h3>
              <p className="text-slate-600">Pinging Weather APIs and live Carrier databases.</p>
            </div>
          )}

          {/* CCT Route Matrix */}
          {!logisticsBooking && logisticsRoutes && (
            <div className="relative z-10 animate-fade-in">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-3 mb-6">Pareto-Optimal Route Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {logisticsRoutes.map((route, idx) => (
                  <div key={idx} className={`bg-white shadow-sm border border-slate-200 rounded-2xl p-6 shadow-md transition-all duration-300 hover:shadow-xl border-l-4 flex flex-col h-full ${
                    route.optimality_score > 7 ? 'border-l-emerald-500 border-y border-r border-slate-200' : 'border-l-indigo-500 border-y border-r border-slate-200'
                  }`}>
                    <div className="flex justify-between items-center mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide border ${
                        route.mode === 'SEA' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 
                        route.mode === 'AIR' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {route.mode} FREIGHT
                      </span>
                      <span className={`font-bold text-sm bg-white border border-slate-200 px-2 py-1 rounded ${
                        route.optimality_score > 7 ? 'text-emerald-400' : 'text-slate-600'
                      }`}>
                        Score: {route.optimality_score}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-900 text-lg mb-2">Carrier: {route.carrier}</h4>
                    {route.live_weather_alert && (
                      <div className="text-xs text-rose-400 font-bold mb-4 bg-rose-500/10 border border-rose-500/30 p-2 rounded-lg flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Slowed due to active Storms/Weather Risks
                      </div>
                    )}
                    
                    <div className="space-y-3 text-sm text-slate-600 mb-6 flex-1">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div> Est. Transit:</span> 
                        <strong className="text-slate-900">{route.metrics.transit_time_days} days</strong>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Est. Cost:</span> 
                        <strong className="text-emerald-400">₹{(route.metrics.estimated_cost_inr || (route.metrics.estimated_cost_usd * 83.5)) ? Math.round(route.metrics.estimated_cost_inr || (route.metrics.estimated_cost_usd * 83.5)).toLocaleString('en-IN') : '0'}</strong>
                      </div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div> Carbon Footprint:</span> 
                        <strong className="text-slate-900">{route.metrics.carbon_footprint_kg.toLocaleString('en-IN')} kg CO2</strong>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Safety/Risk:</span> 
                        <span className={`font-bold px-2 py-0.5 rounded text-xs border ${route.metrics.safety_baseline >= 8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>{route.metrics.safety_baseline}/10</span>
                      </div>
                    </div>

                    <button
                      onClick={() => bookLogisticsRoute(route.route_option_id)}
                      className="w-full bg-slate-100 hover:bg-slate-700 border border-slate-300 text-slate-900 py-3 rounded-xl font-bold transition-all flex justify-center gap-2 mt-auto shadow-sm hover:shadow-md"
                    >
                      <Lock className="w-4 h-4" /> Book & Lock This Route
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Booking & Tracking UI */}
          {logisticsBooking && (
            <div className="mt-8 bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border border-emerald-500/30 shadow-lg relative z-10 animate-fade-in">
              <h3 className="text-emerald-400 text-xl font-bold mb-6 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" /> Shipment Successfully Booked
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-white rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Routing ID</span>
                  <div className="font-mono text-slate-900">{logisticsBooking.route_option_id}</div>
                </div>
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wide">Master Bill of Lading / Tracking</span>
                  <div className="font-mono font-black text-lg text-blue-700">{logisticsBooking.tracking_number}</div>
                </div>
              </div>
              
              <div className="bg-black/50 border border-slate-200 text-slate-800 p-6 rounded-2xl shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <h4 className="font-bold text-blue-400 mb-4 flex items-center gap-2 border-b border-slate-200 pb-3">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div> Live Satellite Feed
                </h4>
                
                {logisticsTracking ? (
                  <div className="space-y-2 relative z-10">
                    <div className="text-2xl font-black text-emerald-400 mb-1">
                      Status: {logisticsTracking.live_status_code}
                    </div>
                    <div className="text-slate-800 font-medium text-lg">
                      {logisticsTracking.status_description}
                    </div>
                    <div className="text-xs text-slate-500 mt-4 flex justify-between items-center pt-4 border-t border-slate-200">
                      <span>Last Ping: {new Date(logisticsTracking.timestamp).toLocaleString()}</span>
                      <span className="bg-white border border-slate-200 px-2 py-1 rounded-md text-slate-600 font-mono">{logisticsTracking.location_ping}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-600 italic py-4">Awaiting carrier webhook...</div>
                )}
                
                <button 
                  onClick={() => fetchTracking(logisticsBooking.tracking_number)} 
                  className="mt-6 bg-slate-100 hover:bg-slate-700 text-slate-800 border border-slate-300 px-4 py-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 relative z-10"
                >
                  <RefreshCw className="w-3 h-3" /> Force Ping Location Update
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
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-2 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
              <Package className="w-6 h-6" />
            </div>
            AI-Powered Product Intelligence
          </h2>
          <p className="text-slate-600 mb-8 relative z-10 ml-12">Upload a product image. TradeOS AI will auto-classify HS Codes, estimate quality, and build your catalog.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Left Column: Image Upload & Description */}
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              
              <div className="mb-6 border-2 border-dashed border-blue-500/30 rounded-2xl p-8 text-center bg-blue-50/50 hover:bg-blue-50 transition-colors cursor-pointer group relative">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">AI Product Scanner</h3>
                <p className="text-sm text-slate-500">Drag & Drop or Click to upload product/packaging photo.</p>
              </div>

              <div className="relative flex items-center py-4">
                 <div className="flex-grow border-t border-slate-200"></div>
                 <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold uppercase">Or enter manually</span>
                 <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="mb-4">
                <textarea 
                  value={catalogDescription}
                  onChange={e => setCatalogDescription(e.target.value)}
                  placeholder="e.g., High-Quality organic turmeric powder, 5 tons available..." 
                  className="w-full p-4 rounded-xl border border-slate-200 bg-white text-slate-900 focus:bg-slate-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner min-h-[100px] resize-y"
                ></textarea>
              </div>
              
              <button 
                disabled={loading} 
                onClick={generateCatalog} 
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border mt-auto ${
                  loading ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed shadow-none' : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/50 shadow-lg shadow-blue-500/10 hover:-translate-y-0.5'
                }`}
              >
                {loading ? <><RefreshCw className="w-5 h-5 animate-spin" /> AI Processing...</> : <><RefreshCw className="w-5 h-5" /> Generate Smart Catalog</>}
              </button>
            </div>

            {/* Right Column: AI Output */}
            <div className="flex flex-col gap-6">
              {loading && (
                <div className="bg-white border border-slate-200 p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[300px]">
                  <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Analyzing Product Image...</h3>
                  <p className="text-slate-500 text-sm animate-pulse">Running Vision Models, OCR, and HS Code Prediction.</p>
                </div>
              )}

              {!loading && !smartCatalogItem && !productIntelligence && (
                <div className="bg-white border border-dashed border-slate-300 p-8 rounded-2xl flex flex-col items-center justify-center text-center h-full min-h-[300px] text-slate-500">
                  <ShieldCheck className="w-12 h-12 text-slate-300 mb-4" />
                  <p>Upload an image to generate a verified product profile.</p>
                </div>
              )}

              {smartCatalogItem && (
                <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl animate-fade-in flex flex-col h-full relative overflow-hidden">
                  {/* Background decoration if high score */}
                  {productIntelligence && productIntelligence.trade_readiness_score > 80 && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
                  )}

                  <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2 text-lg">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Verified Trade Catalog
                    </h4>
                    {productIntelligence && (
                      <div className="text-right">
                        <div className="text-3xl font-black text-blue-600 leading-none">{productIntelligence.trade_readiness_score}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Readiness Score</div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col md:flex-row gap-6 mb-6">
                    {productIntelligence?.image_url && (
                      <div className="w-full md:w-1/3 h-32 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                        <img src={productIntelligence.image_url} alt={smartCatalogItem.product_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur">AI SCANNED</div>
                      </div>
                    )}
                    
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Product</span>
                        <strong className="text-slate-900 text-sm leading-tight block">{smartCatalogItem.product_name}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">HS Code (Predicted)</span>
                        <strong className="text-blue-700 text-sm font-mono">{smartCatalogItem.hs_code}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Category</span>
                        <strong className="text-slate-900 text-sm">{smartCatalogItem.category}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Quality Estimate</span>
                        <strong className="text-emerald-600 text-sm">{productIntelligence?.quality_score || 'N/A'}/100</strong>
                      </div>
                    </div>
                  </div>

                  {productIntelligence?.certifications && productIntelligence.certifications.length > 0 && (
                    <div className="mb-6">
                      <span className="block text-[10px] text-slate-500 uppercase font-bold mb-2">Detected Certifications</span>
                      <div className="flex flex-wrap gap-2">
                        {productIntelligence.certifications.map((cert, idx) => (
                          <span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {productIntelligence?.extracted_text && (
                    <div className="mb-6 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono">
                      <strong className="text-slate-800 block mb-1">OCR Extracted Data:</strong>
                      {productIntelligence.extracted_text}
                    </div>
                  )}

                  <button 
                    onClick={findGlobalBuyers} 
                    className="mt-auto w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-600 font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    Forward to Global Buyer Matchmaker <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exporter: Buyer Matchmaker Tab */}
      {activeTab === 'buyer-discovery' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-2 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
              <Search className="w-6 h-6" />
            </div>
            Global Buyer Matchmaker
          </h2>
          <p className="text-slate-600 mb-8 relative z-10 ml-12">AI has routed verified Global RFQs (Requests for Quotation) and matched buyers looking for your exact compliance and HS parameters.</p>
          
          {loading ? (
             <div className="text-center py-16 relative z-10 bg-white shadow-sm border border-slate-200/50 rounded-2xl border border-slate-200 backdrop-blur-sm">
               <div className="inline-block p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-full mb-4">
                 <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
               </div>
               <h3 className="text-lg font-bold text-emerald-500">Executing Semantic Retrieval and Risk-Weighted Scoring Algorithms...</h3>
             </div>
          ) : !exporterBuyerLeads ? (
             <div className="text-center py-16 relative z-10 bg-white shadow-sm border border-slate-200 rounded-2xl border border-dashed border-slate-200 text-slate-500 font-medium">
               No leads yet. Create a catalog first.
             </div>
          ) : (
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border border-slate-200 relative z-10">
              <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Top Intelligent Buyer Leads Found ({exporterBuyerLeads.length})
              </h4>
              
              {exporterBuyerLeads.length === 0 && <p className="text-slate-600 bg-white p-4 rounded-xl shadow-sm text-center border border-slate-200">No Active RFQs match your HS Code or semantic description.</p>}

              <div className="space-y-4">
                {exporterBuyerLeads.map((buyer, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-emerald-500/30 shadow-sm hover:border-emerald-500/50 transition-colors flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                      <strong className="text-lg text-slate-900 block mb-1">{buyer.company_name} <span className="text-slate-500 font-normal">({buyer.country})</span></strong>
                      <p className="text-sm text-slate-600 mb-2">Looking to import: <strong className="text-slate-800">{buyer.target_quantity} {buyer.unit}</strong> of <strong className="text-slate-800">{buyer.product_name}</strong></p>
                      <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg italic flex items-start gap-2">
                        <span className="text-emerald-500 not-italic">💡</span> 
                        <span><strong className="not-italic block mb-0.5 text-emerald-500">AI Match:</strong> {buyer.match_explanation}</span>
                      </p>
                    </div>
                    <div className="text-center md:text-right w-full md:w-auto flex flex-col items-center md:items-end gap-3">
                      <div className={`text-3xl font-black ${buyer.match_score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                         {buyer.match_score}% <span className="text-sm text-slate-500 font-bold uppercase tracking-wider block md:inline">Match</span>
                      </div>
                      <button 
                        onClick={() => runExporterPitch(buyer)} 
                        className="w-full md:w-auto bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 font-bold py-2.5 px-6 rounded-xl border border-emerald-500/50 shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-2"
                      >
                        Review Buyer & Pitch <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exporter: Buyer Credit Risk Tab */}
      {activeTab === 'credit-risk' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-2 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            Risk & Compliance Intelligence
          </h2>
          <p className="text-slate-600 mb-8 relative z-10 ml-12 text-sm">Live calculation of credit exposure, port congestion, currency volatility, and geopolitical risks.</p>
          
          {loading ? (
             <div className="text-center py-16 relative z-10 bg-white shadow-sm border border-slate-200 rounded-2xl border border-slate-200 shadow-inner">
               <div className="inline-block p-4 bg-rose-500/20 rounded-full mb-6 border border-rose-500/30">
                 <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
               </div>
               <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-wide">Risk Agent querying live intelligence nodes...</h3>
               <p className="text-slate-500 font-mono text-xs">Connecting to OpenWeather, AIS Port Congestion & FastForex APIS.</p>
             </div>
          ) : buyerRiskResult ? (
            <div className={`mt-8 p-8 rounded-3xl bg-white shadow-sm border border-slate-200 border relative z-10 animate-fade-in ${
              buyerRiskResult.risk_level === 'HIGH' ? 'border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.15)]' : 
              buyerRiskResult.risk_level === 'MEDIUM' ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]' : 'border-emerald-500/50 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
            }`}>
              <div className="flex justify-between items-start mb-8 border-b border-slate-200 pb-6">
                 <h3 className={`text-2xl font-black flex items-center gap-3 ${
                   buyerRiskResult.risk_level === 'HIGH' ? 'text-rose-500' : 
                   buyerRiskResult.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                 }`}>
                   <Activity className="w-8 h-8" />
                   {buyerRiskResult.companyName}
                 </h3>
                 <div className={`px-4 py-2 rounded-xl font-black text-sm border flex items-center gap-2 ${
                    buyerRiskResult.proceed_recommended ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {buyerRiskResult.proceed_recommended ? <><CheckCircle2 className="w-4 h-4" /> CLEAR FOR EXPORT</> : <><AlertTriangle className="w-4 h-4" /> TRADE BLOCKED</>}
                 </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* RADAR CHART VISUALIZATION */}
                <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col items-center justify-center relative">
                  <div className="absolute top-4 left-4 text-xs font-bold text-slate-500 tracking-wider uppercase">Risk Vector Analysis</div>
                  <div className="w-full h-[300px] mt-4">
                     <ResponsiveContainer width="100%" height="100%">
                       <RadarChart cx="50%" cy="50%" outerRadius="70%" data={[
                         { subject: 'Financial', A: buyerRiskResult.components.financial, fullMark: 10 },
                         { subject: 'Logistics', A: buyerRiskResult.components.logistics, fullMark: 10 },
                         { subject: 'Compliance', A: buyerRiskResult.components.compliance, fullMark: 10 },
                         { subject: 'Market', A: buyerRiskResult.components.market, fullMark: 10 },
                         { subject: 'Geopolitical', A: 5, fullMark: 10 }
                       ]}>
                         <PolarGrid stroke="#334155" />
                         <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                         <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: '#475569' }} />
                         <Radar name="Risk Level" dataKey="A" stroke={buyerRiskResult.risk_level === 'HIGH' ? '#f43f5e' : '#10b981'} fill={buyerRiskResult.risk_level === 'HIGH' ? '#f43f5e' : '#10b981'} fillOpacity={0.4} />
                       </RadarChart>
                     </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center flex flex-col justify-center flex-1">
                    <h4 className="text-slate-500 font-bold uppercase tracking-wide text-xs mb-2">Overall Volatility Score</h4>
                    <div className={`text-6xl font-black mb-2 ${
                      buyerRiskResult.risk_level === 'HIGH' ? 'text-rose-500' : 
                      buyerRiskResult.risk_level === 'MEDIUM' ? 'text-amber-500' : 'text-emerald-500'
                    }`}>
                      {buyerRiskResult.risk_score}<span className="text-2xl text-slate-600">/10</span>
                    </div>
                    <div className={`text-sm font-bold uppercase tracking-wider ${
                      buyerRiskResult.risk_level === 'HIGH' ? 'text-rose-400' : 
                      buyerRiskResult.risk_level === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>{buyerRiskResult.risk_level} EXPOSURE</div>
                  </div>

                  <div className="bg-white border border-slate-200 p-6 rounded-2xl flex-1">
                    <h4 className="text-blue-700 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                      <ShieldAlert className="w-5 h-5" /> Autonomous AI Directives
                    </h4>
                    <ul className="space-y-3">
                      {buyerRiskResult.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-3 text-slate-800 text-sm bg-white shadow-sm border border-slate-200 p-3 rounded-xl border border-slate-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0 shadow-[0_0_5px_rgba(99,102,241,0.8)]"></div>
                          <span className="leading-relaxed">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border border-slate-200 shadow-sm relative z-10">
               <h4 className="text-slate-500 font-bold mb-6 uppercase text-xs tracking-wider">Select Lead to Execute Real-time Intelligence</h4>
               <div className="space-y-4">
                 {(exporterBuyerLeads || []).map((b, i) => (
                   <div key={i} className="flex flex-col md:flex-row justify-between items-center p-5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors gap-4 group">
                      <div className="text-center md:text-left flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">{b.country.charAt(0)}</div>
                        <div>
                          <strong className="text-slate-900 text-lg block">{b.company_name}</strong> 
                          <span className="text-slate-500 text-xs uppercase tracking-wider font-mono">{b.country}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => evaluateBuyerRisk(b)} 
                        className="w-full md:w-auto bg-slate-100 hover:bg-blue-700 text-slate-800 hover:text-blue-700 py-2 px-6 rounded-lg font-bold border border-slate-200 hover:border-indigo-500 transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldAlert className="w-4 h-4" /> Run 5-Pillar Analysis
                      </button>
                   </div>
                 ))}
                 {(!exporterBuyerLeads || exporterBuyerLeads.length === 0) && (
                   <div className="text-center py-12 text-slate-600 bg-white rounded-xl border border-dashed border-slate-200">
                     No target entities found in memory.
                   </div>
                 )}
               </div>
            </div>
          )}
        </div>
      )}

      {/* Exporter & Importer: Deal Room & AI Trade Advisor Tab */}
      {(activeTab === 'exporter-negotiator' || activeTab === 'importer-negotiator') && exporterDealRoom && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-2 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 border border-orange-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            Deal Room Workspace
          </h2>
          <p className="text-slate-600 mb-8 relative z-10 ml-12 text-sm">Human-to-Human Negotiation Copiloted by TradeOS AI</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            {/* LEFT/CENTER: The Human Sandbox (Buyer & Exporter Timeline) */}
            <div className="col-span-2 bg-white shadow-sm border border-slate-200 rounded-2xl flex flex-col h-[600px] overflow-hidden relative">
               <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center z-10 shadow-sm">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-100 text-indigo-700 font-bold rounded-lg flex items-center justify-center border border-indigo-200">
                     {exporterDealRoom.opponent?.country?.charAt(0) || exporterDealRoom.buyer?.country?.charAt(0) || 'U'}
                   </div>
                   <div>
                     <div className="font-bold text-slate-900">{exporterDealRoom.opponent?.company_name || exporterDealRoom.buyer?.company_name}</div>
                     <div className="text-xs text-slate-500 font-mono">{user?.user_type === 'exporter' ? 'BUYER' : 'SUPPLIER'} • {exporterDealRoom.opponent?.country || exporterDealRoom.buyer?.country || 'Global'}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="font-bold text-slate-900">{user?.company_name || (user?.user_type === 'exporter' ? 'AgriTech Exports' : 'Global Trade Corp')}</div>
                   <div className="text-xs text-slate-500 font-mono">YOU ({user?.user_type === 'exporter' ? 'EXPORTER' : 'IMPORTER'}) • {user?.country || 'India'}</div>
                 </div>
               </div>

                 <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 space-y-4 custom-scrollbar">
                 {exporterDealRoom.history.map((msg, idx) => (
                   <div key={idx} className={`flex w-full ${msg.sender === (user?.user_type === 'exporter' ? 'Exporter' : 'Buyer') ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[75%] p-4 rounded-2xl shadow-sm border ${
                       msg.sender === (user?.user_type === 'exporter' ? 'Exporter' : 'Buyer') ? 'bg-blue-500/10 border-blue-500/20 text-blue-900 rounded-tr-sm' : 'bg-white border-slate-200 text-slate-800 rounded-tl-sm'
                     }`}>
                       <div className="flex justify-between items-end mb-2 gap-4">
                         <span className="font-bold text-sm opacity-80">{msg.sender}</span>
                         <span className="text-[10px] uppercase font-mono opacity-60">{msg.time}</span>
                       </div>
                       <div className="font-medium text-[15px]">{msg.text}</div>
                       {msg.price && (
                         <div className={`mt-2 font-black text-lg ${msg.sender === (user?.user_type === 'exporter' ? 'Exporter' : 'Buyer') ? 'text-blue-600' : 'text-slate-900'}`}>
                           Offer: ₹{msg.price.toFixed(2)}/kg
                         </div>
                       )}
                     </div>
                   </div>
                 ))}
                 
                 {exporterDealRoom.status === 'AGREED' && (
                   <div className="w-full flex justify-center py-4">
                     <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-sm animate-fade-in">
                       <CheckCircle2 className="w-5 h-5 text-emerald-500" /> AGREEMENT REACHED AT ₹{exporterDealRoom.agreedPrice?.toFixed(2)}/KG
                     </div>
                   </div>
                 )}
               </div>

               {/* Exporter Input Area */}
               <div className="p-4 bg-white border-t border-slate-200 z-10">
                 {exporterDealRoom.status === 'AGREED' ? (
                   user?.user_type === 'exporter' ? (
                     <button
                       onClick={async () => {
                          setLoading(true);
                          setActiveTab('outbound-quote');
                          try {
                             const response = await fetch('http://localhost:8000/api/intelligence/generate-pitch', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                   product_name: exporterDealRoom.buyer?.product_name || 'Commodity',
                                   quantity: Math.min(parseFloat(smartCatalogItem?.quantity || 1), parseFloat(exporterDealRoom.buyer?.target_quantity || 1)),
                                   unit: 'tons',
                                   hs_code: smartCatalogItem?.hs_code || '000000',
                                   buyer_id: exporterDealRoom.buyer?.buyer_id || 'UNKNOWN',
                                   buyer_country: exporterDealRoom.buyer?.country || 'Global',
                                   agreed_price_per_kg: exporterDealRoom.agreedPrice
                                })
                             });
                             const data = await response.json();
                             if (data.status === 'success') {
                                setNegotiationResult({
                                   buyer: exporterDealRoom.buyer,
                                   final_agreed_price: exporterDealRoom.agreedPrice,
                                   risk_status: data.risk_status,
                                   proposal: data.proposal
                                });
                             } else {
                                alert('Failed to generate pitch');
                                setActiveTab('exporter-negotiator');
                             }
                          } catch (err) {
                             console.error(err);
                             setActiveTab('exporter-negotiator');
                          } finally {
                             setLoading(false);
                          }
                       }}
                       className="w-full py-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-500 font-black rounded-xl shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                     >
                       Launch Trade Execution Engine <ArrowRight className="w-5 h-5" />
                     </button>
                   ) : (
                     <button
                       onClick={() => {
                          setNegotiationResult({
                             supplier: exporterDealRoom.opponent || exporterDealRoom.buyer,
                             final_agreed_price: exporterDealRoom.agreedPrice
                          });
                          runDocumentAgent(exporterDealRoom.opponent || exporterDealRoom.buyer);
                       }}
                       className="w-full py-4 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/50 text-violet-500 font-black rounded-xl shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                     >
                       Lock in Price & Proceed to Document Validation <ArrowRight className="w-5 h-5" />
                     </button>
                   )
                 ) : (
                   <div className="flex gap-3">
                     <div className="relative flex-1">
                       <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none font-bold text-slate-400">₹</div>
                       <input 
                         type="number"
                         value={exporterDealRoom.currentOfferPrice}
                         onChange={(e) => setExporterDealRoom(prev => ({...prev, currentOfferPrice: e.target.value}))}
                         placeholder="Your counter-offer price per kg..."
                         className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none transition-all text-slate-900 font-bold"
                         onKeyDown={(e) => e.key === 'Enter' && handleExporterOffer()}
                       />
                     </div>
                     <button
                       onClick={handleDealAgreement}
                       className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center gap-2"
                     >
                       Accept Offer <CheckCircle2 className="w-4 h-4" />
                     </button>
                     <button
                       onClick={handleExporterOffer}
                       disabled={!exporterDealRoom.currentOfferPrice}
                       className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                     >
                       Send Offer <Send className="w-4 h-4" />
                     </button>
                   </div>
                 )}
               </div>
            </div>

            {/* RIGHT: AI Trade Advisor Panel */}
            <div className="col-span-1 flex flex-col gap-4">
               <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                 <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                   <Activity className="w-5 h-5 text-indigo-500" /> AI Trade Advisor
                 </h3>
                 
                 <div className="mb-6">
                   <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Agreement Confidence</div>
                   <div className="flex items-end gap-2">
                     <span className={`text-4xl font-black ${
                       exporterDealRoom.intelligence.confidence > 80 ? 'text-emerald-500' :
                       exporterDealRoom.intelligence.confidence > 50 ? 'text-amber-500' : 'text-rose-500'
                     }`}>
                       {exporterDealRoom.intelligence.confidence}%
                     </span>
                     <span className="text-slate-500 text-sm mb-1 font-medium">Probability</span>
                   </div>
                   {/* Progress bar */}
                   <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden border border-slate-200">
                     <div 
                       className={`h-full transition-all duration-1000 ${
                         exporterDealRoom.intelligence.confidence > 80 ? 'bg-emerald-500' :
                         exporterDealRoom.intelligence.confidence > 50 ? 'bg-amber-500' : 'bg-rose-500'
                       }`}
                       style={{ width: `${exporterDealRoom.intelligence.confidence}%` }}
                     ></div>
                   </div>
                 </div>

                 <div className="space-y-4">
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                     <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><BarChart3 className="w-3 h-3 text-blue-500" /> MarketAgent</div>
                     <div className="text-sm font-medium text-slate-800">Global Avg Price: <strong className="text-blue-600">₹{exporterDealRoom.intelligence.marketAvg}/kg</strong></div>
                   </div>
                   
                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                     <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><ShieldCheck className="w-3 h-3 text-emerald-500" /> RiskAgent</div>
                     <div className="text-sm font-medium text-emerald-600">Low Risk (Trade Route Clear)</div>
                   </div>

                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                     <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Ship className="w-3 h-3 text-indigo-500" /> LogisticsAgent</div>
                     <div className="text-sm font-medium text-slate-800">Expected Delivery: <strong className="text-indigo-600">28 Days (Sea Freight)</strong></div>
                   </div>

                   <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 border-l-2 border-l-amber-500">
                     <div className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-amber-500" /> NegotiationAgent</div>
                     <div className="text-sm font-medium text-slate-800 mb-1">Suggested Counter: <strong className="text-amber-600">₹{exporterDealRoom.intelligence.suggestion}/kg</strong></div>
                     <div className="text-[11px] text-slate-500 italic mt-1 border-t border-slate-200 pt-1">
                       <strong>Insight:</strong> Buyer RFQ indicates delivery within 20 days. Buyer may value speed over minor price discounts.
                     </div>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Exporter: Outbound Quotes Tab */}
      {activeTab === 'outbound-quote' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 -ml-20 -mt-20 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-2 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400 border border-orange-500/30">
              <TrendingUp className="w-6 h-6" />
            </div>
            Outbound Logistics & Quoting
          </h2>
          <p className="text-slate-600 mb-8 relative z-10 ml-12">Generate a CIF (Cost, Insurance & Freight) quote dynamically for the buyer.</p>
          
          {loading ? (
             <div className="text-center py-16 relative z-10">
               <div className="inline-block p-4 bg-orange-500/20 border border-orange-500/30 rounded-full mb-6">
                 <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
               </div>
               <h3 className="text-xl font-bold text-slate-800">Intelligence Engine computing CIF Quote via live APIs...</h3>
             </div>
          ) : negotiationResult && negotiationResult.proposal ? (
            <div className="bg-white shadow-sm border border-slate-200 p-6 rounded-2xl border-2 border-orange-500/30 shadow-xl relative z-10 animate-fade-in mt-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-200 pb-4">
                 <h4 className="text-xl font-bold text-orange-500 flex items-center gap-2">
                   Autonomous Proposal: CIF {negotiationResult.buyer?.country || 'Destination'}
                 </h4>
                 <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg font-bold text-amber-400 text-xs tracking-wide uppercase flex items-center gap-2">
                   <ShieldCheck className="w-4 h-4" /> Risk Gatekeeper: {negotiationResult.risk_status || 'Analyzed'}
                 </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl mb-6 border border-slate-200">
                 <div className="mb-4">
                   <span className="text-xs uppercase tracking-wide font-bold text-orange-500 block mb-1">Product Details</span>
                   <div className="text-lg text-slate-900 font-medium">{negotiationResult.proposal.quantity} {negotiationResult.proposal.unit} of {negotiationResult.proposal.product_name}</div>
                   <div className="text-sm text-slate-500 font-mono mt-1">
                      (Breakdown: {negotiationResult.proposal.quantity_kg} kg @ {negotiationResult.proposal.price_per_kg} {negotiationResult.proposal.currency}/kg)
                   </div>
                 </div>
                 
                 <div className="space-y-3 mb-6">
                   <div className="flex justify-between items-center py-2 border-b border-slate-200">
                     <span className="text-slate-600">FOB Base Price (yfinance)</span>
                     <strong className="text-slate-900">{negotiationResult.proposal.base_price_fob.toLocaleString()} {negotiationResult.proposal.currency}</strong>
                   </div>
                   <div className="flex justify-between items-center py-2 border-b border-slate-200">
                     <span className="text-slate-600">Est. Freight & Insurance</span>
                     <strong className="text-slate-900">{negotiationResult.proposal.freight_insurance.toLocaleString()} {negotiationResult.proposal.currency}</strong>
                   </div>
                 </div>
                 
                 <div className="bg-white shadow-sm border border-slate-200 p-4 rounded-xl border border-orange-500/30 flex justify-between items-center shadow-sm">
                    <span className="font-bold text-slate-600 uppercase tracking-wide text-sm">Total CIF Offer</span>
                    <strong className="text-2xl font-black text-rose-500">
                      {negotiationResult.proposal.total_cif_quote.toLocaleString()} {negotiationResult.proposal.currency}
                    </strong>
                 </div>
              </div>
              
              <div className="text-center">
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
                  className={`w-full max-w-lg mx-auto py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 border ${
                    riskResult?.overall_risk === 'HIGH' ? 'bg-rose-900 border-rose-800 text-rose-300 cursor-not-allowed shadow-none opacity-80' : 'bg-orange-600/20 hover:bg-orange-600/30 border-orange-500/50 text-orange-400 hover:text-orange-300 shadow-orange-500/10 hover:-translate-y-1'
                  }`}
                >
                  {riskResult?.overall_risk === 'HIGH' ? <><AlertTriangle className="w-5 h-5" /> Blocked by Compliance Gatekeeper</> : <>Send Verified Pitch <Send className="w-5 h-5" /></>}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm border border-slate-200 p-12 rounded-2xl border border-dashed border-slate-200 relative z-10 text-center">
              <div className="inline-block p-4 bg-white border border-slate-200 rounded-full text-slate-600 mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-2">Calculate Freight to Buyer</h4>
              <p className="text-slate-500">No active pitch input available.</p>
            </div>
          )}
        </div>
      )}

      {/* Exporter: Document Generation Tab */}
      {activeTab === 'doc-generation' && (
        <div className="bg-white/90 shadow-md backdrop-blur border border-slate-200 p-8 rounded-3xl animate-slide-up relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
          
          <h2 className="text-2xl font-black text-slate-100 mb-2 flex items-center gap-3 relative z-10">
            <div className="p-2 bg-violet-500/20 rounded-lg text-violet-400 border border-violet-500/30">
              <FileText className="w-6 h-6" />
            </div>
            Export Document Generation
          </h2>
          <p className="text-slate-600 mb-8 relative z-10 ml-12">Auto-generate Commercial Invoices, Packing Lists, and Certificates of Origin.</p>
          
          <div className="bg-white shadow-sm border border-slate-200 p-8 rounded-2xl border border-violet-500/30 relative z-10 text-center shadow-inner">
            <div className="inline-block p-5 bg-white border border-slate-200 rounded-full text-violet-500 shadow-md mb-6">
              <FileCheck className="w-10 h-10" />
            </div>
            <h4 className="text-2xl font-bold text-violet-400 mb-6">Ready to Generate Export Package</h4>
            <button 
                disabled={riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH'}
                onClick={() => runDocumentAgent(negotiationResult?.buyer || {})} 
                className={`w-full max-w-lg mx-auto py-4 rounded-xl font-bold text-lg shadow-xl transition-all flex items-center justify-center gap-2 border ${
                  (riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH') ? 'bg-rose-900 border-rose-800 text-rose-300 cursor-not-allowed shadow-none' : 'bg-violet-600/20 hover:bg-violet-600/30 border-violet-500/50 text-violet-400 hover:text-violet-300 shadow-violet-500/10 hover:-translate-y-1'
                }`}
            >
                {(riskResult?.overall_risk === 'HIGH' || buyerRiskResult?.overall_risk === 'HIGH') ? <><AlertTriangle className="w-5 h-5" /> Generation Blocked Due to Sanctions</> : <><FileText className="w-5 h-5" /> Generate & e-Sign Documents</>}
            </button>
          </div>
        </div>
      )}

        </div>
      </div>
      
      {/* FLOATING AI CHAT WIDGET */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
         {isChatOpen && (
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-80 md:w-96 mb-4 flex flex-col h-[500px] overflow-hidden">
               <div className="bg-blue-700 text-white p-4 font-bold flex justify-between items-center shadow-md z-10">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>TradeOS AI</span>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="text-blue-200 hover:text-white transition-colors">&times;</button>
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
                  {chatHistory.length === 0 && (
                     <div className="text-center text-slate-500 text-sm mt-4 italic">
                       How can I help you navigate global trade today?
                     </div>
                  )}
                  {chatHistory.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
               </div>
               <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 z-10">
                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask anything..."
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                  />
                  <button onClick={submitChat} disabled={isChatLoading} className="bg-blue-600 text-white p-2.5 rounded-full hover:bg-blue-700 transition-colors shadow-md disabled:bg-blue-400">
                    {isChatLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
               </div>
            </div>
         )}
         {!isChatOpen && (
            <button 
              onClick={() => setIsChatOpen(true)}
              className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-[0_4px_14px_0_rgba(37,99,235,0.39)] transition-transform hover:scale-110"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
         )}
      </div>

    </div>
  );
};

export default EnhancedTradePlatform;
