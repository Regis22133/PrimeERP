import React from 'react';
import { Check } from 'lucide-react';

interface SuggestionPopoverProps {
  suggestions: Record<string, any>;
  onApply: (field: string, value: any) => void;
  position?: 'top' | 'bottom';
}

const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
  suggestions,
  onApply,
  position = 'bottom'
}) => {
  if (Object.keys(suggestions).length === 0) return null;

  return (
    <div className={`absolute ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 z-50 w-full max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-2`}>
      <div className="text-sm font-medium text-gray-700 mb-2">Sugestões:</div>
      <div className="space-y-2">
        {Object.entries(suggestions).map(([field, value]) => (
          <div
            key={field}
            className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
            onClick={() => onApply(field, value)}
          >
            <div>
              <div className="text-sm font-medium text-gray-900">
                {field.charAt(0).toUpperCase() + field.slice(1)}
              </div>
              <div className="text-sm text-gray-500">
                {value instanceof Date ? value.toLocaleDateString() : String(value)}
              </div>
            </div>
            <Check className="w-4 h-4 text-green-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default SuggestionPopover;