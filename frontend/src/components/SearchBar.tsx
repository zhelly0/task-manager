import React from 'react';

interface SearchBarProps {
    value: string;
    onChange: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ value, onChange }) => {
    return (
        <div className="search-bar">
            <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="form-input search-input"
                aria-label="Search tasks"
            />
            {value && (
                <button
                    type="button"
                    className="search-clear"
                    onClick={() => onChange('')}
                    aria-label="Clear search"
                >
                    ✕
                </button>
            )}
        </div>
    );
};

export default SearchBar;
