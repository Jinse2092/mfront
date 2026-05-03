import React, { createContext, useState, useCallback } from 'react';
import io from 'socket.io-client';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [userAge, setUserAge] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const initializeSocket = useCallback((id, name, age) => {
    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('registerUser', { userId: id, name, age });
    });

    newSocket.on('adminMessage', (data) => {
      setMessages(prev => [...prev, data.message]);
    });

    newSocket.on('messageSent', (data) => {
      // Message acknowledged
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('error', (data) => {
      console.error('Socket error:', data);
    });

    setSocket(newSocket);
    setUserId(id);
    setUserName(name);
    setUserAge(age);

    return newSocket;
  }, []);

  const sendMessage = useCallback((type, text = '', url = '', isAutoCapture = false) => {
    if (socket && isConnected) {
      socket.emit('userMessage', {
        userId,
        name: userName,
        age: userAge,
        type,
        text,
        url,
        isAutoCapture
      });
      
      // Add message to local state
      const newMessage = {
        _id: Date.now(),
        userId,
        sender: 'user',
        type,
        text: type === 'text' ? text : '',
        url: type === 'image' ? url : '',
        isAutoCapture,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
    }
  }, [socket, isConnected, userId, userName, userAge]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setUserId(null);
      setUserName(null);
      setUserAge(null);
      setMessages([]);
      setIsConnected(false);
    }
  }, [socket]);

  return (
    <SocketContext.Provider value={{
      socket,
      userId,
      userName,
      userAge,
      messages,
      isConnected,
      initializeSocket,
      sendMessage,
      disconnect,
      setMessages
    }}>
      {children}
    </SocketContext.Provider>
  );
};
