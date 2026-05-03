import React, { useState, useEffect } from 'react';
import '../styles/UserForm.css';

const UserForm = ({ onSubmit }) => {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check if user data exists in localStorage
    const savedName = localStorage.getItem('msger_name');
    const savedAge = localStorage.getItem('msger_age');

    if (savedName && savedAge) {
      onSubmit(savedName, parseInt(savedAge));
    }
  }, [onSubmit]);

  const validate = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!age) {
      newErrors.age = 'Age is required';
    } else if (isNaN(age) || age < 1 || age > 150) {
      newErrors.age = 'Age must be a number between 1 and 150';
    }

    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();

    if (Object.keys(newErrors).length === 0) {
      // Save to localStorage
      localStorage.setItem('msger_name', name);
      localStorage.setItem('msger_age', age);
      
      onSubmit(name, parseInt(age));
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <h1>Welcome to Msger</h1>
        <p>Please enter your details to start chatting</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setErrors({...errors, name: ''});
              }}
              placeholder="Enter your name"
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="age">Age *</label>
            <input
              type="number"
              id="age"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setErrors({...errors, age: ''});
              }}
              placeholder="Enter your age"
              className={errors.age ? 'input-error' : ''}
            />
            {errors.age && <span className="error-text">{errors.age}</span>}
          </div>

          <button type="submit" className="submit-btn">
            Start Chatting
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
