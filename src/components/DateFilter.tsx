import React, { useState } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from 'date-fns/locale';

interface DateFilterProps {
  onChange: (filterType: string, startDate?: Date, endDate?: Date) => void;
}

const DateFilter: React.FC<DateFilterProps> = ({ onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<'month' | 'year' | 'custom'>('month');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customDateRange, setCustomDateRange] = useState<[Date | null, Date | null]>([new Date(), new Date()]);

  const handleFilterTypeChange = (type: 'month' | 'year' | 'custom') => {
    setFilterType(type);
    
    const now = new Date();
    
    switch (type) {
      case 'month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        onChange('month', startOfMonth, endOfMonth);
        setSelectedDate(now);
        break;
      
      case 'year':
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        onChange('year', startOfYear, endOfYear);
        setSelectedDate(now);
        break;
      
      case 'custom':
        // Keep current custom range
        if (customDateRange[0] && customDateRange[1]) {
          onChange('custom', customDateRange[0], customDateRange[1]);
        }
        break;
    }
  };

  const handleMonthChange = (date: Date) => {
    setSelectedDate(date);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    onChange('month', startOfMonth, endOfMonth);
  };

  const handleYearChange = (date: Date) => {
    setSelectedDate(date);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const endOfYear = new Date(date.getFullYear(), 11, 31);
    onChange('year', startOfYear, endOfYear);
  };

  const handleCustomDateChange = (dates: [Date | null, Date | null]) => {
    setCustomDateRange(dates);
    if (dates[0] && dates[1]) {
      // Ensure start date is at beginning of day and end date is at end of day
      const startDate = new Date(dates[0]);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(dates[1]);
      endDate.setHours(23, 59, 59, 999);
      
      onChange('custom', startDate, endDate);
    }
  };

  const getDisplayText = () => {
    switch (filterType) {
      case 'month':
        return selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      case 'year':
        return selectedDate.getFullYear().toString();
      case 'custom':
        return customDateRange[0] && customDateRange[1]
          ? `${customDateRange[0].toLocaleDateString('pt-BR')} - ${customDateRange[1].toLocaleDateString('pt-BR')}`
          : 'Selecione um período';
      default:
        return 'Selecione um período';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
      >
        <CalendarDays className="w-4 h-4" />
        <span>{getDisplayText()}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-[340px] bg-white rounded-lg shadow-lg border p-4 z-[9999]">
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterTypeChange('month')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'month'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => handleFilterTypeChange('year')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'year'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Ano
              </button>
              <button
                onClick={() => handleFilterTypeChange('custom')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterType === 'custom'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Período
              </button>
            </div>

            <div className="bg-white rounded-lg overflow-hidden">
              {filterType === 'month' && (
                <DatePicker
                  selected={selectedDate}
                  onChange={handleMonthChange}
                  dateFormat="MM/yyyy"
                  showMonthYearPicker
                  inline
                  locale={ptBR}
                  wrapperClassName="z-[9999]"
                  popperClassName="z-[9999]"
                  calendarClassName="z-[9999]"
                />
              )}
              
              {filterType === 'year' && (
                <DatePicker
                  selected={selectedDate}
                  onChange={handleYearChange}
                  showYearPicker
                  dateFormat="yyyy"
                  inline
                  locale={ptBR}
                  wrapperClassName="z-[9999]"
                  popperClassName="z-[9999]"
                  calendarClassName="z-[9999]"
                />
              )}
              
              {filterType === 'custom' && (
                <DatePicker
                  selected={customDateRange[0]}
                  onChange={handleCustomDateChange}
                  startDate={customDateRange[0]}
                  endDate={customDateRange[1]}
                  selectsRange
                  inline
                  locale={ptBR}
                  dateFormat="dd/MM/yyyy"
                  showMonthDropdown
                  showYearDropdown
                  dropdownMode="select"
                  yearDropdownItemNumber={100}
                  scrollableYearDropdown
                  minDate={new Date(1900, 0, 1)}
                  maxDate={new Date(2100, 11, 31)}
                  monthsShown={2}
                  wrapperClassName="z-[9999]"
                  popperClassName="z-[9999]"
                  calendarClassName="z-[9999]"
                />
              )}
            </div>

            <div className="pt-3 border-t flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;