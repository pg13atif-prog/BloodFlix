import React, { useState, useRef, useEffect } from 'react';
import './CustomSelect.css';

const CustomSelect = ({ value, onChange, options, className = '', id = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const handleSelect = (newValue) => {
    onChange({ target: { value: newValue } });
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${className}`} ref={containerRef} id={id}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={0}
      >
        <span>{selectedOption?.label}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      <div className={`custom-select-dropdown ${isOpen ? 'open' : ''}`} role="listbox">
        {options.map((opt) => (
          <div
            key={opt.value}
            className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
            onClick={() => handleSelect(opt.value)}
            role="option"
            aria-selected={opt.value === value}
          >
            {opt.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomSelect;
