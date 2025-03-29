import React from 'react';
import { SearchColumn } from '../types';

interface SearchColumnSelectProps {
  columns: SearchColumn[];
  selectedColumn: string;
  onColumnChange: (columnId: string) => void;
}

const SearchColumnSelect: React.FC<SearchColumnSelectProps> = ({
  columns,
  selectedColumn,
  onColumnChange
}) => {
  return (
    <select
      className="px-4 py-2 border rounded-lg"
      value={selectedColumn}
      onChange={(e) => onColumnChange(e.target.value)}
    >
      {columns.map(column => (
        <option key={column.id} value={column.id}>
          {column.label}
        </option>
      ))}
    </select>
  );
};

export default SearchColumnSelect;