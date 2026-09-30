import React, { useState, useCallback } from 'react';
import './SearchBar.css';

interface SearchBarProps {
  onSearch: (filters: SearchFilters) => void;
  isLoading?: boolean;
}

export interface SearchFilters {
  search?: string;
  source?: string;
  city?: string;
  state?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  minSqft?: number;
  maxSqft?: number;
  minBeds?: number;
  maxBeds?: number;
  minBaths?: number;
  maxBaths?: number;
  targetBudget?: number;
  budgetRangePercent?: number;
}

const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
  ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
  ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming']
];

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading = false }) => {
  const [filters, setFilters] = useState<SearchFilters>({});
  const isPriceRangeInvalid = filters.minPrice !== undefined && filters.maxPrice !== undefined && filters.minPrice > filters.maxPrice;
  const isSqftRangeInvalid = filters.minSqft !== undefined && filters.maxSqft !== undefined && filters.minSqft > filters.maxSqft;
  const isBedRangeInvalid = filters.minBeds !== undefined && filters.maxBeds !== undefined && filters.minBeds > filters.maxBeds;
  const isBathRangeInvalid = filters.minBaths !== undefined && filters.maxBaths !== undefined && filters.minBaths > filters.maxBaths;
  const hasInvalidRange = isPriceRangeInvalid || isSqftRangeInvalid || isBedRangeInvalid || isBathRangeInvalid;

  const handleSearch = useCallback(() => {
    if (hasInvalidRange) {
      return;
    }
    onSearch(filters);
  }, [filters, hasInvalidRange, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields = ['minPrice', 'maxPrice', 'minSqft', 'maxSqft', 'minBeds', 'maxBeds', 'minBaths', 'maxBaths', 'targetBudget', 'budgetRangePercent'];
    const newValue = numericFields.includes(name) ? (value ? parseFloat(value) : undefined) : value || undefined;

    setFilters(prev => {
      let nextFilters = { ...prev, [name]: newValue };
      if ((name === 'targetBudget' || name === 'budgetRangePercent') && newValue !== undefined) {
        nextFilters = { ...nextFilters, budgetRangePercent: name === 'budgetRangePercent' ? newValue as number : prev.budgetRangePercent };
        delete nextFilters.minPrice;
        delete nextFilters.maxPrice;
      } else if ((name === 'minPrice' || name === 'maxPrice') && newValue !== undefined) {
        delete nextFilters.targetBudget;
        delete nextFilters.budgetRangePercent;
      }
      return nextFilters;
    });
  };

  const handleReset = () => {
    setFilters({});
    onSearch({});
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="search-bar">
      <div className="search-container">
        <div className="search-field filter-control">
          <label htmlFor="search-listings">Search listings</label>
          <input
            type="text"
            name="search"
            id="search-listings"
            value={filters.search || ''}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
        </div>

        <div className="filter-row">
          <div className="filter-control">
            <label htmlFor="filter-city">City</label>
            <input
              type="text"
              name="city"
              id="filter-city"
              value={filters.city || ''}
              onChange={handleInputChange}
              className="filter-input"
            />
          </div>
          <div className="filter-control">
            <label htmlFor="filter-state">State</label>
            <select
              name="state"
              id="filter-state"
              value={filters.state || ''}
              onChange={handleInputChange}
              className="filter-select"
            >
              <option value="">All States</option>
              {US_STATES.map(([abbreviation, name]) => (
                <option key={abbreviation} value={abbreviation}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-control">
            <label htmlFor="filter-source">Source</label>
            <select
              name="source"
              id="filter-source"
              value={filters.source || ''}
              onChange={handleInputChange}
              className="filter-select"
            >
              <option value="">All Sources</option>
              <option value="MLS_A">MLS A</option>
              <option value="MLS_B">MLS B</option>
              <option value="MLS_C">MLS C</option>
            </select>
          </div>
          <div className="filter-control">
            <label htmlFor="filter-status">Status</label>
            <select
              name="status"
              id="filter-status"
              value={filters.status || ''}
              onChange={handleInputChange}
              className="filter-select"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="sold">Sold</option>
            </select>
          </div>
        </div>

        <div className="budget-price-row">
          <fieldset className="range-group price-range">
            <legend>Price</legend>
            <div className="range-inputs">
              <div className="filter-control">
                <label htmlFor="filter-min-price">Minimum</label>
                <input type="number" name="minPrice" id="filter-min-price" value={filters.minPrice ?? ''} onChange={handleInputChange} max={filters.maxPrice} aria-invalid={isPriceRangeInvalid} className="filter-input" />
                {isPriceRangeInvalid && <span className="range-error" role="alert">Minimum value cannot be greater than the maximum value.</span>}
              </div>
              <div className="filter-control">
                <label htmlFor="filter-max-price">Maximum</label>
                <input type="number" name="maxPrice" id="filter-max-price" value={filters.maxPrice ?? ''} onChange={handleInputChange} min={filters.minPrice} className="filter-input" />
              </div>
            </div>
          </fieldset>

          <fieldset className="range-group target-budget-range">
            <legend>Target Budget</legend>
            <div className="target-budget-controls">
              <div className="filter-control">
                <label htmlFor="filter-target-budget">Amount</label>
                <input
                  type="number"
                  name="targetBudget"
                  id="filter-target-budget"
                  min="0"
                  value={filters.targetBudget ?? ''}
                  onChange={handleInputChange}
                  className="filter-input"
                />
              </div>
              <div className="filter-control budget-range-control">
                <label htmlFor="filter-budget-range">Tolerance: ±{filters.budgetRangePercent ?? 20}%</label>
                <input
                  type="range"
                  name="budgetRangePercent"
                  id="filter-budget-range"
                  min="0"
                  max="50"
                  step="1"
                  value={filters.budgetRangePercent ?? 20}
                  onChange={handleInputChange}
                  disabled={filters.targetBudget === undefined}
                  className="budget-range"
                  aria-valuetext={`Plus or minus ${filters.budgetRangePercent ?? 20} percent`}
                />
              </div>
            </div>
          </fieldset>
        </div>

        <div className="range-groups">
          <fieldset className="range-group price-range">
            <legend>Square Feet</legend>
            <div className="range-inputs">
              <div className="filter-control">
                <label htmlFor="filter-min-sqft">Minimum</label>
                <input type="number" name="minSqft" id="filter-min-sqft" value={filters.minSqft ?? ''} onChange={handleInputChange} min="0" max={filters.maxSqft} aria-invalid={isSqftRangeInvalid} className="filter-input" />
                {isSqftRangeInvalid && <span className="range-error" role="alert">Minimum value cannot be greater than the maximum value.</span>}
              </div>
              <div className="filter-control">
                <label htmlFor="filter-max-sqft">Maximum</label>
                <input type="number" name="maxSqft" id="filter-max-sqft" value={filters.maxSqft ?? ''} onChange={handleInputChange} min={filters.minSqft ?? 0} className="filter-input" />
              </div>
            </div>
          </fieldset>

          <fieldset className="range-group">
            <legend>Bedrooms</legend>
            <div className="range-inputs">
              <div className="filter-control">
                <label htmlFor="filter-min-beds">Minimum</label>
                <input type="number" name="minBeds" id="filter-min-beds" value={filters.minBeds ?? ''} onChange={handleInputChange} min="0" max={filters.maxBeds} aria-invalid={isBedRangeInvalid} className="filter-input" />
                {isBedRangeInvalid && <span className="range-error" role="alert">Minimum value cannot be greater than the maximum value.</span>}
              </div>
              <div className="filter-control">
                <label htmlFor="filter-max-beds">Maximum</label>
                <input type="number" name="maxBeds" id="filter-max-beds" value={filters.maxBeds ?? ''} onChange={handleInputChange} min={filters.minBeds ?? 0} className="filter-input" />
              </div>
            </div>
          </fieldset>

          <fieldset className="range-group">
            <legend>Bathrooms</legend>
            <div className="range-inputs">
              <div className="filter-control">
                <label htmlFor="filter-min-baths">Minimum</label>
                <input type="number" name="minBaths" id="filter-min-baths" value={filters.minBaths ?? ''} onChange={handleInputChange} min="0" max={filters.maxBaths} step="0.5" aria-invalid={isBathRangeInvalid} className="filter-input" />
                {isBathRangeInvalid && <span className="range-error" role="alert">Minimum value cannot be greater than the maximum value.</span>}
              </div>
              <div className="filter-control">
                <label htmlFor="filter-max-baths">Maximum</label>
                <input type="number" name="maxBaths" id="filter-max-baths" value={filters.maxBaths ?? ''} onChange={handleInputChange} min={filters.minBaths ?? 0} step="0.5" className="filter-input" />
              </div>
            </div>
          </fieldset>
        </div>

        <div className="button-group">
          <button
            onClick={handleSearch}
            disabled={isLoading || hasInvalidRange}
            className="btn btn-primary"
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
