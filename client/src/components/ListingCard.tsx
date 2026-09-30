import React from 'react';
import type { Listing } from '../services/api';
import './ListingCard.css';

interface ListingCardProps {
  listing: Listing;
  targetBudget?: number;
  budgetRangePercent?: number;
  onSelect?: (listing: Listing) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, targetBudget, budgetRangePercent = 20, onSelect }) => {
  const normalizedRange = Math.min(50, Math.max(0, budgetRangePercent));
  const isInTargetBudget = targetBudget !== undefined &&
    listing.price >= targetBudget * (1 - normalizedRange / 100) &&
    listing.price <= targetBudget * (1 + normalizedRange / 100);

  const handleClick = () => {
    if (onSelect) {
      onSelect(listing);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'status-active';
      case 'pending':
        return 'status-pending';
      case 'sold':
        return 'status-sold';
      default:
        return 'status-active';
    }
  };

  return (
    <div className="listing-card" onClick={handleClick}>
      <div className="listing-image">
        <div className="placeholder-image">
          <div className="home-icon">🏠</div>
        </div>
        {isInTargetBudget && <span className="listing-budget-badge">In Your Budget</span>}
        <span className={`listing-status ${getStatusColor(listing.status)}`}>
          {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
        </span>
      </div>
      <div className="listing-content">
        <h3 className="listing-address">{listing.address}</h3>
        <p className="listing-location">
          {listing.city}, {listing.state} {listing.zip}
        </p>
        <p className="listing-description">{listing.description}</p>
        <div className="listing-specs">
          <div className="spec">
            <span className="spec-icon">🛏️</span>
            <span>{listing.bedrooms} Beds</span>
          </div>
          <div className="spec">
            <span className="spec-icon">🚿</span>
            <span>{listing.bathrooms} Baths</span>
          </div>
          <div className="spec">
            <span className="spec-icon">📐</span>
            <span>{listing.sqft.toLocaleString()} sqft</span>
          </div>
        </div>
        <div className="listing-meta">
          <span className="listing-price">${listing.price.toLocaleString()}</span>
          <span className={`listing-source source-${listing.source.toLowerCase()}`}>
            {listing.source}
          </span>
        </div>
        <div className="listing-footer">
          <small className="listing-date">Listed {formatDate(listing.listedDate)}</small>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
