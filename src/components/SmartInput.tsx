import React, { useState } from 'react';
import SuggestionPopover from './SuggestionPopover';

interface SmartInputProps {
  type: 'text' | 'number' | 'date' | 'currency';
  value: any;
  onChange: (value: any) => void;
  suggestions?: Record<string, any>;
  onApplySuggestion?: (field: string, value: any) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  pattern?: string;
  maxLength?: number;
  allowNegative?: boolean;
}

const SmartInput: React.FC<SmartInputProps> = ({
  type,
  value,
  onChange,
  suggestions,
  onApplySuggestion,
  label,
  placeholder,
  className = '',
  required,
  pattern,
  maxLength,
  allowNegative = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const formatCurrency = (value: number | string): string => {
    // Handle empty or invalid input
    if (value === '' || value === null || value === undefined) {
      return '';
    }

    // Convert to number and handle invalid inputs
    const numericValue = typeof value === 'string' ? 
      parseFloat(value.replace(/[^\d.-]/g, '')) : value;

    if (isNaN(numericValue)) {
      return '';
    }

    // Format as Brazilian currency
    const formattedValue = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Math.abs(numericValue));

    // Add minus sign for negative values
    return numericValue < 0 ? `-${formattedValue}` : formattedValue;
  };

  const parseCurrency = (value: string): number => {
    // Remove currency symbol, dots, and spaces
    let numericString = value
      .replace(/[R$\s.]/g, '')
      .replace(',', '.');

    // Handle negative values
    const isNegative = numericString.startsWith('-');
    const absoluteValue = numericString.replace(/-/g, '');
    
    // Convert to number
    const number = parseFloat(absoluteValue);
    
    // Return 0 if invalid
    if (isNaN(number)) {
      return 0;
    }
    
    // Apply negative sign if needed and allowed
    return isNegative && allowNegative ? -number : number;
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow free-form input while typing
    setInputValue(rawValue);

    try {
      // Only parse and format when input is valid
      if (rawValue.match(/^-?\d*[,.]?\d*$/)) {
        const numericValue = parseCurrency(rawValue);
        onChange(numericValue);
      }
    } catch (error) {
      console.error('Error handling currency input:', error);
    }
  };

  const handleCurrencyBlur = () => {
    // Format the value when input loses focus
    if (value !== undefined && value !== null) {
      setInputValue(formatCurrency(value));
    }
    setTimeout(() => setIsFocused(false), 200);
  };

  const handleCurrencyFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // Show unformatted value for editing
    setInputValue(value?.toString() || '');
    // Move cursor to end
    e.target.setSelectionRange(e.target.value.length, e.target.value.length);
  };

  const handleSuggestionApply = (field: string, suggestionValue: any) => {
    if (onApplySuggestion) {
      onApplySuggestion(field, suggestionValue);
    }
    if (field === label?.toLowerCase()) {
      onChange(suggestionValue);
    }
  };

  if (type === 'currency') {
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          type="text"
          value={isFocused ? inputValue : formatCurrency(value)}
          onChange={handleCurrencyChange}
          onFocus={handleCurrencyFocus}
          onBlur={handleCurrencyBlur}
          placeholder={placeholder || 'R$ 0,00'}
          className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${value < 0 ? 'text-red-600' : ''} text-right ${className}`}
          required={required}
        />
        {isFocused && suggestions && Object.keys(suggestions).length > 0 && (
          <SuggestionPopover
            suggestions={suggestions}
            onApply={handleSuggestionApply}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 200)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
        required={required}
        pattern={pattern}
        maxLength={maxLength}
      />
      {isFocused && suggestions && Object.keys(suggestions).length > 0 && (
        <SuggestionPopover
          suggestions={suggestions}
          onApply={handleSuggestionApply}
        />
      )}
    </div>
  );
};

export default SmartInput;