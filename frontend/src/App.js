import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Register from './pages/Register';
import Login from './pages/Login';
import KYCUpload from './pages/KYCUpload';
import EnhancedTradePlatform from './pages/EnhancedTradePlatform';
import 'bootstrap/dist/css/bootstrap.min.css';

const ProtectedRoute = ({ children, requireVerified = true }) => {
  const { user, loading } = useAuth();

  if (loading) return <div className="flex justify-center p-20 text-indigo-600 font-bold">Initializing TradeOS Secure Gateway...</div>;
  if (!user) return <Navigate to="/login" />;
  
  if (requireVerified && user.verification_status !== 'VERIFIED') {
    return <Navigate to="/kyc-upload" />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) {
    return user.verification_status === 'VERIFIED' 
      ? <Navigate to="/dashboard" /> 
      : <Navigate to="/kyc-upload" />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Verification Route (Must be logged in but status can be PENDING) */}
          <Route 
            path="/kyc-upload" 
            element={
              <ProtectedRoute requireVerified={false}>
                <KYCUpload />
              </ProtectedRoute>
            } 
          />

          {/* Verified Marketplace Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <EnhancedTradePlatform />
              </ProtectedRoute>
            } 
          />

          {/* Default Redirection */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
