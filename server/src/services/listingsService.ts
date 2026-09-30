// Mock database service for real estate listings aggregation
// This simulates MongoDB operations with in-memory data

export interface Listing {
  id: string;
  source: string; // e.g., "MLS_A", "MLS_B"
  address: string; // Free-text street address, not normalized
  city: string;
  state: string;
  zip: string;
  price: number; // USD, list price
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  latitude: number;
  longitude: number;
  listedDate: Date;
  status: 'active' | 'pending' | 'sold';
  description: string; // Free text, searchable
}

export interface AggregatedListing extends Listing {
  aggregatedAt: Date;
}

class InvalidFilterRangeError extends Error {
  readonly code = 100;

  constructor(field: string) {
    super(`Minimum ${field} cannot be greater than maximum ${field}.`);
    this.name = 'InvalidFilterRangeError';
  }
}

// In-memory data store
let listingsDatabase: AggregatedListing[] = [
  {
    id: 'A1',
    source: 'MLS_A',
    address: '123 Main St, Apt 4B',
    city: 'Springfield',
    state: 'VA',
    zip: '22150',
    price: 450000,
    bedrooms: 2,
    bathrooms: 1.5,
    sqft: 980,
    latitude: 38.7893,
    longitude: -77.1873,
    listedDate: new Date('2026-08-29'),
    status: 'active',
    description: 'Bright top-floor condo near shops and transit. Pet friendly.',
    aggregatedAt: new Date()
  },
  {
    id: 'B7',
    source: 'MLS_B',
    address: '123 Main Street, Unit 4B',
    city: 'Springfield',
    state: 'VA',
    zip: '22150',
    price: 452000,
    bedrooms: 2,
    bathrooms: 1.5,
    sqft: 980,
    latitude: 38.7893,
    longitude: -77.1873,
    listedDate: new Date('2026-08-27'),
    status: 'active',
    description: 'Top floor condo, walk to shopping. Pets allowed.',
    aggregatedAt: new Date()
  },
  {
    id: 'A2',
    source: 'MLS_A',
    address: '456 Oak Ave',
    city: 'Springfield',
    state: 'VA',
    zip: '22150',
    price: 525000,
    bedrooms: 3,
    bathrooms: 2.0,
    sqft: 1450,
    latitude: 38.7791,
    longitude: -77.1901,
    listedDate: new Date('2026-09-02'),
    status: 'active',
    description: 'Updated kitchen, fenced yard, close to schools.',
    aggregatedAt: new Date()
  },
  {
    id: 'B8',
    source: 'MLS_B',
    address: '456 Oak Avenue',
    city: 'Springfield',
    state: 'VA',
    zip: '22151',
    price: 527500,
    bedrooms: 3,
    bathrooms: 2.0,
    sqft: 1450,
    latitude: 38.7791,
    longitude: -77.1901,
    listedDate: new Date('2026-08-30'),
    status: 'active',
    description: 'Renovated kitchen, fenced backyard, near schools.',
    aggregatedAt: new Date()
  },
  {
    id: 'A3',
    source: 'MLS_A',
    address: '789 Pine Rd',
    city: 'Fairfax',
    state: 'VA',
    zip: '22030',
    price: 399000,
    bedrooms: 2,
    bathrooms: 1.0,
    sqft: 850,
    latitude: 38.8462,
    longitude: -77.3064,
    listedDate: new Date('2026-09-01'),
    status: 'active',
    description: 'Cozy starter home, no pets.',
    aggregatedAt: new Date()
  },
  {
    id: 'B9',
    source: 'MLS_B',
    address: '789 Pine Rd',
    city: 'Fairfax',
    state: 'VA',
    zip: '22030',
    price: 399500,
    bedrooms: 2,
    bathrooms: 1.0,
    sqft: 850,
    latitude: 38.8462,
    longitude: -77.3064,
    listedDate: new Date('2026-08-25'),
    status: 'active',
    description: 'Cozy starter home, pets not permitted.',
    aggregatedAt: new Date()
  },
  {
    id: 'A4',
    source: 'MLS_A',
    address: '22 Birch Ln',
    city: 'Reston',
    state: 'VA',
    zip: '20190',
    price: 610000,
    bedrooms: 4,
    bathrooms: 3.0,
    sqft: 2100,
    latitude: 38.9586,
    longitude: -77.3570,
    listedDate: new Date('2026-09-03'),
    status: 'active',
    description: 'Spacious family home near Reston Town Center. Pets welcome.',
    aggregatedAt: new Date()
  },
  {
    id: 'B10',
    source: 'MLS_B',
    address: '100 Maple Dr',
    city: 'Reston',
    state: 'VA',
    zip: '20190',
    price: 585000,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1900,
    latitude: 38.9601,
    longitude: -77.3499,
    listedDate: new Date('2026-08-20'),
    status: 'active',
    description: 'Townhome with 2-car garage, community pool.',
    aggregatedAt: new Date()
  },
  {
    id: 'A5',
    source: 'MLS_A',
    address: '55 Elm Ct',
    city: 'Vienna',
    state: 'VA',
    zip: '22180',
    price: 470000,
    bedrooms: 3,
    bathrooms: 2.0,
    sqft: 1300,
    latitude: 38.9012,
    longitude: -77.2653,
    listedDate: new Date('2026-09-04'),
    status: 'active',
    description: 'Quiet cul-de-sac, walkable to Metro. No pets.',
    aggregatedAt: new Date()
  },
  {
    id: 'B11',
    source: 'MLS_B',
    address: '55 Elm Court',
    city: 'Vienna',
    state: 'VA',
    zip: '22180',
    price: 465000,
    bedrooms: 3,
    bathrooms: 2.0,
    sqft: 1300,
    latitude: 38.9012,
    longitude: -77.2653,
    listedDate: new Date('2026-08-15'),
    status: 'active',
    description: 'Peaceful street, close to Metro. Pet restrictions apply.',
    aggregatedAt: new Date()
  },
  {
    id: 'A6',
    source: 'MLS_A',
    address: '300 Cedar Blvd',
    city: 'Manassas',
    state: 'VA',
    zip: '20110',
    price: 415000,
    bedrooms: 3,
    bathrooms: 2.0,
    sqft: 1600,
    latitude: 38.7509,
    longitude: -77.4753,
    listedDate: new Date('2026-08-10'),
    status: 'active',
    description: 'Split-level home, large driveway, pets allowed.',
    aggregatedAt: new Date()
  },
  {
    id: 'A7',
    source: 'MLS_A',
    address: '42 Willow Way',
    city: 'Chantilly',
    state: 'VA',
    zip: '20151',
    price: 540000,
    bedrooms: 4,
    bathrooms: 2.5,
    sqft: 1950,
    latitude: 38.8909,
    longitude: -77.4316,
    listedDate: new Date('2026-07-28'),
    status: 'pending',
    description: 'Corner lot, recently painted, no pets due to HOA.',
    aggregatedAt: new Date()
  }
];

class ListingsService {
  static getPaginatedListings(
    filter: Parameters<typeof ListingsService.getListings>[0],
    requestedPage: number
  ): { data: AggregatedListing[]; count: number; page: number; pageSize: number; totalPages: number } {
    const pageSize = 3;
    const filteredListings = this.getListings(filter);
    const count = filteredListings.length;
    const totalPages = Math.ceil(count / pageSize);
    const page = totalPages === 0
      ? 1
      : Math.min(Math.max(1, Math.floor(requestedPage) || 1), totalPages);
    const offset = (page - 1) * pageSize;

    return {
      data: filteredListings.slice(offset, offset + pageSize),
      count,
      page,
      pageSize,
      totalPages
    };
  }

  /**
   * Get all listings with optional filtering
   */
  static getListings(
    filter?: Partial<{
      source: string;
      city: string;
      state: string;
      status: string;
      minPrice: number;
      maxPrice: number;
      minSqft: number;
      maxSqft: number;
      minBeds: number;
      maxBeds: number;
      minBaths: number;
      maxBaths: number;
      targetBudget: number;
      budgetRangePercent: number;
      searchTerm: string;
    }>
  ): AggregatedListing[] {
    const ranges = [
      { field: 'price', min: filter?.minPrice, max: filter?.maxPrice },
      { field: 'square feet', min: filter?.minSqft, max: filter?.maxSqft },
      { field: 'bedrooms', min: filter?.minBeds, max: filter?.maxBeds },
      { field: 'bathrooms', min: filter?.minBaths, max: filter?.maxBaths }
    ];

    for (const range of ranges) {
      if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
        throw new InvalidFilterRangeError(range.field);
      }
    }

    let results = [...listingsDatabase];

    if (filter?.source) {
      results = results.filter(l => l.source === filter.source);
    }

    if (filter?.city) {
      results = results.filter(l => l.city.toLowerCase() === filter.city!.toLowerCase());
    }

    if (filter?.state) {
      results = results.filter(l => l.state.toUpperCase() === filter.state!.toUpperCase());
    }

    if (filter?.status) {
      results = results.filter(l => l.status === filter.status);
    }

    if (filter?.minPrice !== undefined) {
      results = results.filter(l => l.price >= filter.minPrice!);
    }

    if (filter?.maxPrice !== undefined) {
      results = results.filter(l => l.price <= filter.maxPrice!);
    }

    if (filter?.minSqft !== undefined) {
      results = results.filter(l => l.sqft >= filter.minSqft!);
    }

    if (filter?.maxSqft !== undefined) {
      results = results.filter(l => l.sqft <= filter.maxSqft!);
    }

    if (filter?.minBeds !== undefined) {
      results = results.filter(l => l.bedrooms >= filter.minBeds!);
    }

    if (filter?.maxBeds !== undefined) {
      results = results.filter(l => l.bedrooms <= filter.maxBeds!);
    }

    if (filter?.minBaths !== undefined) {
      results = results.filter(l => l.bathrooms >= filter.minBaths!);
    }

    if (filter?.maxBaths !== undefined) {
      results = results.filter(l => l.bathrooms <= filter.maxBaths!);
    }

    if (filter?.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      results = results.filter(l =>
        l.address.toLowerCase().includes(term) ||
        l.city.toLowerCase().includes(term) ||
        l.description.toLowerCase().includes(term)
      );
    }

    const newestFirst = (a: AggregatedListing, b: AggregatedListing) =>
      b.aggregatedAt.getTime() - a.aggregatedAt.getTime();
    const sortFields: Array<keyof Pick<Listing, 'price' | 'sqft' | 'bedrooms' | 'bathrooms'>> = [];
    if (
      filter?.targetBudget !== undefined ||
      filter?.minPrice !== undefined ||
      filter?.maxPrice !== undefined
    ) {
      sortFields.push('price');
    }
    if (filter?.minSqft !== undefined || filter?.maxSqft !== undefined) {
      sortFields.push('sqft');
    }
    if (filter?.minBeds !== undefined || filter?.maxBeds !== undefined) {
      sortFields.push('bedrooms');
    }
    if (filter?.minBaths !== undefined || filter?.maxBaths !== undefined) {
      sortFields.push('bathrooms');
    }

    const sortedResults = results.sort((a, b) => {
      for (const field of sortFields) {
        const difference = b[field] - a[field];
        if (difference !== 0) {
          return difference;
        }
      }
      return newestFirst(a, b);
    });

    if (filter?.targetBudget === undefined) {
      return sortedResults;
    }

    const rangePercent = Math.min(50, Math.max(0, filter.budgetRangePercent ?? 20));
    const minimumTargetPrice = filter.targetBudget * (1 - rangePercent / 100);
    const maximumTargetPrice = filter.targetBudget * (1 + rangePercent / 100);

    return sortedResults.filter(listing => listing.price <= maximumTargetPrice);
  }

  /**
   * Get a single listing by ID
   */
  static getListingById(id: string): AggregatedListing | undefined {
    return listingsDatabase.find(l => l.id === id);
  }

  /**
   * Get listings by source
   */
  static getListingsBySource(source: string): AggregatedListing[] {
    return this.getListings({ source });
  }

  /**
   * Get listings by city
   */
  static getListingsByCity(city: string): AggregatedListing[] {
    return this.getListings({ city });
  }

  /**
   * Get listings by status
   */
  static getListingsByStatus(status: string): AggregatedListing[] {
    return this.getListings({ status });
  }

  /**
   * Get listings by state
   */
  static getListingsByState(state: string): AggregatedListing[] {
    return this.getListings({ state });
  }

  /**
   * Add a new listing
   */
  static addListing(listing: Omit<Listing, 'id'>): AggregatedListing {
    const newListing: AggregatedListing = {
      id: `${listing.source}_${Date.now()}`,
      ...listing,
      aggregatedAt: new Date()
    };
    listingsDatabase.push(newListing);
    return newListing;
  }

  /**
   * Update a listing
   */
  static updateListing(id: string, updates: Partial<Listing>): AggregatedListing | undefined {
    const index = listingsDatabase.findIndex(l => l.id === id);
    if (index !== -1) {
      listingsDatabase[index] = {
        ...listingsDatabase[index],
        ...updates,
        aggregatedAt: new Date()
      };
      return listingsDatabase[index];
    }
    return undefined;
  }

  /**
   * Delete a listing
   */
  static deleteListing(id: string): boolean {
    const index = listingsDatabase.findIndex(l => l.id === id);
    if (index !== -1) {
      listingsDatabase.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get aggregation statistics
   */
  static getStats() {
    const bySource: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byCity: Record<string, number> = {};
    let totalValue = 0;
    let avgBedrooms = 0;
    let avgBathrooms = 0;
    let avgSqft = 0;

    listingsDatabase.forEach(listing => {
      bySource[listing.source] = (bySource[listing.source] || 0) + 1;
      byStatus[listing.status] = (byStatus[listing.status] || 0) + 1;
      const cityKey = `${listing.city}, ${listing.state}`;
      byCity[cityKey] = (byCity[cityKey] || 0) + 1;
      totalValue += listing.price;
      avgBedrooms += listing.bedrooms;
      avgBathrooms += listing.bathrooms;
      avgSqft += listing.sqft;
    });

    const count = listingsDatabase.length;
    const avgPrice = count > 0 ? totalValue / count : 0;

    return {
      totalListings: count,
      averagePrice: avgPrice,
      totalValue,
      averageBedrooms: count > 0 ? avgBedrooms / count : 0,
      averageBathrooms: count > 0 ? avgBathrooms / count : 0,
      averageSqft: count > 0 ? avgSqft / count : 0,
      bySource,
      byStatus,
      byCity
    };
  }
}

export default ListingsService;
