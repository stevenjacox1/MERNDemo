import { randomUUID } from 'crypto';
import { Collection, Filter, MongoClient } from 'mongodb';
import sampleListings from '../sample_listings.json';

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
  listedDate: Date;
  status: 'active' | 'pending' | 'sold';
  description: string;
}

export interface AggregatedListing extends Listing {
  aggregatedAt: Date;
}

export interface ListingFilter {
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
  searchTerm?: string;
}

interface StoredListing extends Omit<AggregatedListing, 'id'> {
  _id: string;
}

interface ListingStats {
  totalListings: number;
  averagePrice: number;
  totalValue: number;
  averageBedrooms: number;
  averageBathrooms: number;
  averageSqft: number;
  bySource: Record<string, number>;
  byStatus: Record<string, number>;
  byCity: Record<string, number>;
}

class InvalidFilterRangeError extends Error {
  readonly code = 100;

  constructor(field: string) {
    super(`Minimum ${field} cannot be greater than maximum ${field}.`);
    this.name = 'InvalidFilterRangeError';
  }
}

class ListingsService {
  private static client: MongoClient;
  private static collection: Collection<StoredListing>;

  static async connect(): Promise<void> {
    const client = new MongoClient(
      process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/listings'
    );

    try {
      await client.connect();
      const database = client.db(process.env.MONGODB_DATABASE || undefined);
      this.client = client;
      this.collection = database.collection<StoredListing>(
        process.env.MONGODB_COLLECTION || 'listings'
      );
      await this.seedIfEmpty();
      console.log(`Connected to MongoDB database "${database.databaseName}"`);
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  static async close(): Promise<void> {
    await this.client?.close();
  }

  static async getPaginatedListings(filter: ListingFilter = {}, requestedPage = 1) {
    this.validateRanges(filter);
    const mongoFilter = this.buildFilter(filter);
    const pageSize = 3;
    const count = await this.collection.countDocuments(mongoFilter);
    const totalPages = Math.ceil(count / pageSize);
    const page = totalPages === 0
      ? 1
      : Math.min(Math.max(1, Math.floor(requestedPage) || 1), totalPages);
    const documents = await this.collection
      .find(mongoFilter)
      .sort(this.buildSort(filter))
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray();

    return {
      data: documents.map(this.toListing),
      count,
      page,
      pageSize,
      totalPages
    };
  }

  static async getListings(filter: ListingFilter = {}): Promise<AggregatedListing[]> {
    this.validateRanges(filter);
    const documents = await this.collection
      .find(this.buildFilter(filter))
      .sort(this.buildSort(filter))
      .toArray();
    return documents.map(this.toListing);
  }

  static async getListingById(id: string): Promise<AggregatedListing | undefined> {
    const listing = await this.collection.findOne({ _id: id });
    return listing ? this.toListing(listing) : undefined;
  }

  static getListingsBySource(source: string): Promise<AggregatedListing[]> {
    return this.getListings({ source });
  }

  static getListingsByCity(city: string): Promise<AggregatedListing[]> {
    return this.getListings({ city });
  }

  static getListingsByStatus(status: string): Promise<AggregatedListing[]> {
    return this.getListings({ status });
  }

  static getListingsByState(state: string): Promise<AggregatedListing[]> {
    return this.getListings({ state });
  }

  static async addListing(listing: Omit<Listing, 'id'>): Promise<AggregatedListing> {
    const newListing: AggregatedListing = {
      id: `${listing.source}_${randomUUID()}`,
      ...listing,
      aggregatedAt: new Date()
    };
    await this.collection.insertOne(this.toDocument(newListing));
    return newListing;
  }

  static async updateListing(
    id: string,
    updates: Partial<Omit<Listing, 'id'>>
  ): Promise<AggregatedListing | undefined> {
    const listing = await this.collection.findOneAndUpdate(
      { _id: id },
      { $set: { ...updates, aggregatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    return listing ? this.toListing(listing) : undefined;
  }

  static async deleteListing(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  static async getStats(): Promise<ListingStats> {
    const [summary, sources, statuses, cities] = await Promise.all([
      this.collection.aggregate<{
        totalListings: number;
        averagePrice: number;
        totalValue: number;
        averageBedrooms: number;
        averageBathrooms: number;
        averageSqft: number;
      }>([{
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalValue: { $sum: '$price' },
          averageBedrooms: { $avg: '$bedrooms' },
          averageBathrooms: { $avg: '$bathrooms' },
          averageSqft: { $avg: '$sqft' }
        }
      }]).next(),
      this.groupCount('source'),
      this.groupCount('status'),
      this.collection.aggregate<{ _id: { city: string; state: string }; count: number }>([
        { $group: { _id: { city: '$city', state: '$state' }, count: { $sum: 1 } } }
      ]).toArray()
    ]);

    return {
      totalListings: summary?.totalListings ?? 0,
      averagePrice: summary?.averagePrice ?? 0,
      totalValue: summary?.totalValue ?? 0,
      averageBedrooms: summary?.averageBedrooms ?? 0,
      averageBathrooms: summary?.averageBathrooms ?? 0,
      averageSqft: summary?.averageSqft ?? 0,
      bySource: sources,
      byStatus: statuses,
      byCity: Object.fromEntries(
        cities.map(({ _id, count }) => [`${_id.city}, ${_id.state}`, count])
      )
    };
  }

  private static async seedIfEmpty(): Promise<void> {
    if (await this.collection.countDocuments({}, { limit: 1 }) > 0) {
      return;
    }

    const documents = sampleListings.map(listing => {
      const listedDate = new Date(listing.listedDate);
      return this.toDocument({
        ...listing,
        listedDate,
        status: listing.status as Listing['status'],
        aggregatedAt: listedDate
      });
    });

    if (documents.length > 0) {
      await this.collection.insertMany(documents, { ordered: false });
    }
  }

  private static async groupCount(field: 'source' | 'status'): Promise<Record<string, number>> {
    const groups = await this.collection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: `$${field}`, count: { $sum: 1 } } }
    ]).toArray();
    return Object.fromEntries(groups.map(group => [group._id, group.count]));
  }

  private static buildFilter(filter: ListingFilter): Filter<StoredListing> {
    const query: Record<string, unknown> = {};
    const ranges: Array<[string, number | undefined, number | undefined]> = [
      ['price', filter.minPrice, filter.maxPrice],
      ['sqft', filter.minSqft, filter.maxSqft],
      ['bedrooms', filter.minBeds, filter.maxBeds],
      ['bathrooms', filter.minBaths, filter.maxBaths]
    ];

    for (const [field, min, max] of ranges) {
      if (min !== undefined || max !== undefined) {
        query[field] = {
          ...(min !== undefined && { $gte: min }),
          ...(max !== undefined && { $lte: max })
        };
      }
    }

    if (filter.source) query.source = filter.source;
    if (filter.status) query.status = filter.status;
    if (filter.city) query.city = this.exactMatch(filter.city);
    if (filter.state) query.state = this.exactMatch(filter.state);

    if (filter.targetBudget !== undefined) {
      const rangePercent = Math.min(50, Math.max(0, filter.budgetRangePercent ?? 20));
      const maxPrice = filter.targetBudget * (1 + rangePercent / 100);
      const existingPrice = query.price as Record<string, number> | undefined;
      query.price = { ...existingPrice, $lte: Math.min(existingPrice?.$lte ?? Infinity, maxPrice) };
    }

    if (filter.searchTerm) {
      const expression = new RegExp(this.escapeRegex(filter.searchTerm), 'i');
      query.$or = [
        { address: expression },
        { city: expression },
        { description: expression }
      ];
    }

    return query as Filter<StoredListing>;
  }

  private static buildSort(filter: ListingFilter): Record<string, 1 | -1> {
    const sort: Record<string, 1 | -1> = {};
    if (filter.targetBudget !== undefined || filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      sort.price = -1;
    }
    if (filter.minSqft !== undefined || filter.maxSqft !== undefined) sort.sqft = -1;
    if (filter.minBeds !== undefined || filter.maxBeds !== undefined) sort.bedrooms = -1;
    if (filter.minBaths !== undefined || filter.maxBaths !== undefined) sort.bathrooms = -1;
    sort.aggregatedAt = -1;
    sort._id = 1;
    return sort;
  }

  private static exactMatch(value: string): RegExp {
    return new RegExp(`^${this.escapeRegex(value)}$`, 'i');
  }

  private static escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private static validateRanges(filter: ListingFilter): void {
    const ranges = [
      { field: 'price', min: filter.minPrice, max: filter.maxPrice },
      { field: 'square feet', min: filter.minSqft, max: filter.maxSqft },
      { field: 'bedrooms', min: filter.minBeds, max: filter.maxBeds },
      { field: 'bathrooms', min: filter.minBaths, max: filter.maxBaths }
    ];
    for (const range of ranges) {
      if (range.min !== undefined && range.max !== undefined && range.min > range.max) {
        throw new InvalidFilterRangeError(range.field);
      }
    }
  }

  private static toDocument(listing: AggregatedListing): StoredListing {
    const { id, ...fields } = listing;
    return { ...fields, _id: id };
  }

  private static toListing(document: StoredListing): AggregatedListing {
    const { _id, ...fields } = document;
    return { ...fields, id: _id };
  }
}

export default ListingsService;
