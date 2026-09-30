import React, { useState, useEffect } from 'react';
import type { Listing } from '../services/api';
import ListingCard from '../components/ListingCard';
import SearchBar, { SearchFilters } from '../components/SearchBar';
import listingsAPI from '../services/api';
import './ListingsPage.css';

const ListingsPage: React.FC = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilters, setActiveFilters] = useState<SearchFilters>({});

  useEffect(() => {
    // Fetch initial listings
    fetchListings({}, 1);
  }, []);

  const fetchListings = async (filters: SearchFilters, page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listingsAPI.getListings(filters, page);
      setListings(result.data);
      setTotalCount(result.count);
      setTotalPages(result.pagination.totalPages);
      setCurrentPage(result.pagination.page);
    } catch (err) {
      const apiError = err as { response?: { data?: { error?: string; errorCode?: string } } };
      setError({
        message: apiError.response?.data?.error || 'Failed to fetch listings. Please try again.',
        code: apiError.response?.data?.errorCode
      });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (filters: SearchFilters) => {
    setActiveFilters(filters);
    setCurrentPage(1);
    fetchListings(filters, 1);
  };

  const handlePageChange = (page: number) => {
    fetchListings(activeFilters, page);
  };

  const handleSelectListing = (listing: Listing) => {
    setSelectedListing(listing);
  };

  const handleCloseListing = () => {
    setSelectedListing(null);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'active':
        return 'badge-active';
      case 'pending':
        return 'badge-pending';
      case 'sold':
        return 'badge-sold';
      default:
        return 'badge-active';
    }
  };

  return (
    <div className="listings-page">
      <header className="page-header">
        <h1>Real Estate Listings</h1>
        <p>Search properties from multiple MLS feeds</p>
      </header>

      <main className="page-content">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {error && (
          <div className="error-message" role="alert">
            <span>{error.message}</span>
            {error.code && <strong>{error.code}</strong>}
          </div>
        )}

        {!isLoading && totalCount === 0 && (
          <div className="empty-state">
            <p>No listings found. Try adjusting your search filters.</p>
          </div>
        )}

        <div className="listings-grid">
          {listings.map(listing => (
            <ListingCard
              key={listing.id}
              listing={listing}
              targetBudget={activeFilters.targetBudget}
              budgetRangePercent={activeFilters.budgetRangePercent}
              onSelect={handleSelectListing}
            />
          ))}
        </div>

        {totalPages > 1 && !isLoading && (
          <nav className="pagination" aria-label="Listings pages">
            <button
              type="button"
              className="pagination-button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
              <button
                key={page}
                type="button"
                className="pagination-button"
                onClick={() => handlePageChange(page)}
                aria-current={currentPage === page ? 'page' : undefined}
                aria-label={`Page ${page}`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              className="pagination-button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              Next
            </button>
          </nav>
        )}

        {isLoading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading listings...</p>
          </div>
        )}

        {selectedListing && (
          <div className="listing-modal-overlay" onClick={handleCloseListing}>
            <div className="listing-modal" onClick={e => e.stopPropagation()}>
              <button className="close-button" onClick={handleCloseListing}>
                ×
              </button>
              <div className="modal-content">
                <div className="modal-header">
                  <div className="modal-header-info">
                    <h2>{selectedListing.address}</h2>
                    <p className="modal-location">
                      {selectedListing.city}, {selectedListing.state} {selectedListing.zip}
                    </p>
                  </div>
                  <span className={`modal-status-badge ${getStatusBadgeClass(selectedListing.status)}`}>
                    {selectedListing.status.toUpperCase()}
                  </span>
                </div>

                <div className="modal-price-section">
                  <span className="modal-price">{formatPrice(selectedListing.price)}</span>
                  <span className="modal-price-per-sqft">
                    ${(selectedListing.price / selectedListing.sqft).toFixed(0)}/sqft
                  </span>
                </div>

                <div className="modal-specs">
                  <div className="spec-item">
                    <span className="spec-label">Bedrooms</span>
                    <span className="spec-value">{selectedListing.bedrooms}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Bathrooms</span>
                    <span className="spec-value">{selectedListing.bathrooms}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Square Feet</span>
                    <span className="spec-value">{selectedListing.sqft.toLocaleString()}</span>
                  </div>
                  <div className="spec-item">
                    <span className="spec-label">Listed Date</span>
                    <span className="spec-value">
                      {new Date(selectedListing.listedDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="modal-description-section">
                  <h3>Property Description</h3>
                  <p>{selectedListing.description}</p>
                </div>

                <div className="modal-details">
                  <div className="detail-row">
                    <span className="detail-label">Source</span>
                    <span className="detail-value">{selectedListing.source}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Coordinates</span>
                    <span className="detail-value">
                      {selectedListing.latitude.toFixed(4)}, {selectedListing.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ListingsPage;
