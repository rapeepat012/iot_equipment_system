import React from "react";
import { Search as SearchIcon } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = "ค้นหา...", className }) => {
  return (
    <div className={"relative min-w-[150px] w-full " + (className || "")}> 
      <div className="flex">
        <span className="inline-flex items-center px-1.5 rounded-l border border-r-0 border-gray-300 bg-zinc-100">
          <SearchIcon className="h-3 w-3 text-gray-500" />
        </span>
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-1.5 py-1 text-xs border border-gray-300 border-r-0 rounded-r focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default SearchInput;


