import axios, { AxiosInstance } from 'axios';

const API_URL = (process.env.REACT_APP_API_URL as string) || 'http://localhost:5000/api';

export interface Listing {
  id: string;
  source: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  latitude: number;
  longitude: number;
  listedDate: string;
  status: 'active' | 'pending' | 'sold';
  description: string;
  aggregatedAt: string;
}

export interface PaginatedListings {
  data: Listing[];
  count: number;
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

class ListingsAPI {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get all listings with optional filters
   */
  async getListings(filters?: {
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
    search?: string;
  }, page = 1): Promise<PaginatedListings> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (filters) {
        if (filters.source) params.append('source', filters.source);
        if (filters.city) params.append('city', filters.city);
        if (filters.state) params.append('state', filters.state);
        if (filters.status) params.append('status', filters.status);
        if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
        if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
        if (filters.minSqft !== undefined) params.append('minSqft', filters.minSqft.toString());
        if (filters.maxSqft !== undefined) params.append('maxSqft', filters.maxSqft.toString());
        if (filters.minBeds) params.append('minBeds', filters.minBeds.toString());
        if (filters.maxBeds) params.append('maxBeds', filters.maxBeds.toString());
        if (filters.minBaths) params.append('minBaths', filters.minBaths.toString());
        if (filters.maxBaths) params.append('maxBaths', filters.maxBaths.toString());
        if (filters.targetBudget !== undefined) params.append('targetBudget', filters.targetBudget.toString());
        if (filters.budgetRangePercent !== undefined) params.append('budgetRangePercent', filters.budgetRangePercent.toString());
        if (filters.search) params.append('search', filters.search);
      }

      const response = await this.api.get('/listings', { params });
      const result = response.data;
      if (result.pagination) {
        return result;
      }

      const allListings: Listing[] = Array.isArray(result.data) ? result.data : [];
      const pageSize = 3;
      const count = typeof result.count === 'number' ? result.count : allListings.length;
      const totalPages = Math.ceil(count / pageSize);
      const normalizedPage = totalPages === 0 ? 1 : Math.min(Math.max(1, page), totalPages);
      const offset = (normalizedPage - 1) * pageSize;

      return {
        data: allListings.slice(offset, offset + pageSize),
        count,
        pagination: {
          page: normalizedPage,
          pageSize,
          totalPages
        }
      };
    } catch (error) {
      console.error('Error fetching listings:', error);
      throw error;
    }
  }

  /**
   * Get a single listing by ID
   */
  async getListingById(id: string): Promise<Listing> {
    try {
      const response = await this.api.get(`/listings/${id}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching listing ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get listings by source
   */
  async getListingsBySource(source: string): Promise<Listing[]> {
    try {
      const response = await this.api.get(`/listings/source/${source}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching listings from source ${source}:`, error);
      throw error;
    }
  }

  /**
   * Get listings by city
   */
  async getListingsByCity(city: string): Promise<Listing[]> {
    try {
      const response = await this.api.get(`/listings/city/${city}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching listings from city ${city}:`, error);
      throw error;
    }
  }

  /**
   * Get listings by status
   */
  async getListingsByStatus(status: string): Promise<Listing[]> {
    try {
      const response = await this.api.get(`/listings/status/${status}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching listings by status ${status}:`, error);
      throw error;
    }
  }

  /**
   * Get listings by state
   */
  async getListingsByState(state: string): Promise<Listing[]> {
    try {
      const response = await this.api.get(`/listings/state/${state}`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching listings from state ${state}:`, error);
      throw error;
    }
  }

  /**
   * Create a new listing
   */
  async createListing(listing: Omit<Listing, 'id' | 'aggregatedAt' | 'listedDate'> & { listedDate?: string }): Promise<Listing> {
    try {
      const response = await this.api.post('/listings', listing);
      return response.data.data;
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }

  /**
   * Update a listing
   */
  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing> {
    try {
      const response = await this.api.put(`/listings/${id}`, updates);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating listing ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a listing
   */
  async deleteListing(id: string): Promise<boolean> {
    try {
      await this.api.delete(`/listings/${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting listing ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get aggregation statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await this.api.get('/listings/stats/overview');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw error;
    }
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.data.status === 'OK';
    } catch (error) {
      console.error('API health check failed:', error);
      return false;
    }
  }
}

export default new ListingsAPI();
