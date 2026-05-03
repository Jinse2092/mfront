import React, { useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import UserForm from './components/UserForm';
import ChatPage from './components/ChatPage';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import { SocketContext, SocketProvider } from './context/SocketContext';
import './App.css';

function AppContent() {
  const navigate = useNavigate();
  const { initializeSocket } = useContext(SocketContext);
  const [adminToken, setAdminToken] = useState(localStorage.getItem('admin_token'));

  const handleFormSubmit = (name, age) => {
    const userId = localStorage.getItem('msger_userId') || uuidv4();
    localStorage.setItem('msger_userId', userId);
    
    initializeSocket(userId, name, age);
    navigate('/chat');
  };

  const handleAdminLoginSuccess = (token) => {
    setAdminToken(token);
    navigate('/admin');
  };

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_token');
    setAdminToken(null);
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/" element={<UserForm onSubmit={handleFormSubmit} />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/login" element={<AdminLogin onLoginSuccess={handleAdminLoginSuccess} />} />
      <Route path="/admin" element={adminToken ? <AdminDashboard token={adminToken} onLogout={handleAdminLogout} /> : <Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <SocketProvider>
      <Router>
        <AppContent />
      </Router>
    </SocketProvider>
  );
}

export default App;
