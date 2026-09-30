using System.Text.RegularExpressions;
using ListingsApi.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace ListingsApi.Services;

public sealed class ListingsService(IMongoCollection<Listing>? collection, bool useMockData)
{
    private const int PageSize = 3;
    private readonly IMongoCollection<Listing>? _collection = collection;
    private readonly bool _useMockData = useMockData;
    private List<Listing> _mockListings = [];

    public async Task<PaginatedListings> GetPageAsync(
        ListingFilter filter,
        int requestedPage,
        CancellationToken cancellationToken)
    {
        ValidateRanges(filter);
        if (_useMockData)
        {
            var mockListings = GetMockMatching(filter);
            var mockCount = mockListings.Count;
            var mockTotalPages = (int)Math.Ceiling(mockCount / (double)PageSize);
            var mockPage = mockTotalPages == 0 ? 1 : Math.Min(Math.Max(1, requestedPage), mockTotalPages);
            var mockData = mockListings.Skip((mockPage - 1) * PageSize).Take(PageSize).ToList();
            return new PaginatedListings(mockData, mockCount, mockPage, PageSize, mockTotalPages);
        }

        var mongoFilter = BuildFilter(filter);
        var count = await Collection.CountDocumentsAsync(mongoFilter, cancellationToken: cancellationToken);
        var totalPages = (int)Math.Ceiling(count / (double)PageSize);
        var page = totalPages == 0
            ? 1
            : Math.Min(Math.Max(1, requestedPage), totalPages);

        var data = await Collection
            .Find(mongoFilter)
            .Sort(BuildSort(filter))
            .Skip((page - 1) * PageSize)
            .Limit(PageSize)
            .ToListAsync(cancellationToken);

        return new PaginatedListings(data, count, page, PageSize, totalPages);
    }

    public Task<List<Listing>> GetMatchingAsync(ListingFilter filter, CancellationToken cancellationToken)
    {
        ValidateRanges(filter);
        if (_useMockData)
        {
            return Task.FromResult(GetMockMatching(filter));
        }

        return Collection
            .Find(BuildFilter(filter))
            .Sort(BuildSort(filter))
            .ToListAsync(cancellationToken);
    }

    public async Task<Listing?> GetByIdAsync(string id, CancellationToken cancellationToken)
    {
        if (_useMockData)
        {
            return _mockListings.FirstOrDefault(listing => listing.Id == id);
        }

        return await Collection.Find(listing => listing.Id == id).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Listing> AddAsync(ListingCreateRequest request, CancellationToken cancellationToken)
    {
        var listedDate = request.ListedDate.HasValue
            ? DateTime.SpecifyKind(request.ListedDate.Value, DateTimeKind.Utc)
            : DateTime.UtcNow;
        var listing = new Listing
        {
            Id = $"{request.Source}_{Guid.NewGuid():N}",
            Source = request.Source!,
            Address = request.Address!,
            City = request.City!,
            State = request.State!,
            Zip = request.Zip!,
            Price = request.Price!.Value,
            Bedrooms = request.Bedrooms!.Value,
            Bathrooms = request.Bathrooms!.Value,
            Sqft = request.Sqft ?? 0,
            Latitude = request.Latitude ?? 0,
            Longitude = request.Longitude ?? 0,
            ListedDate = listedDate,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "active" : request.Status,
            Description = request.Description!,
            AggregatedAt = DateTime.UtcNow
        };

        if (_useMockData)
        {
            _mockListings.Add(listing);
            return listing;
        }

        await Collection.InsertOneAsync(listing, cancellationToken: cancellationToken);
        return listing;
    }

    public async Task<Listing?> UpdateAsync(
        string id,
        ListingUpdateRequest request,
        CancellationToken cancellationToken)
    {
        if (_useMockData)
        {
            var listing = _mockListings.FirstOrDefault(item => item.Id == id);
            if (listing is null)
            {
                return null;
            }

            ApplyUpdates(listing, request);
            listing.AggregatedAt = DateTime.UtcNow;
            return listing;
        }

        var updates = new List<UpdateDefinition<Listing>>();
        var update = Builders<Listing>.Update;

        if (request.Source is not null) updates.Add(update.Set(item => item.Source, request.Source));
        if (request.Address is not null) updates.Add(update.Set(item => item.Address, request.Address));
        if (request.City is not null) updates.Add(update.Set(item => item.City, request.City));
        if (request.State is not null) updates.Add(update.Set(item => item.State, request.State));
        if (request.Zip is not null) updates.Add(update.Set(item => item.Zip, request.Zip));
        if (request.Price.HasValue) updates.Add(update.Set(item => item.Price, request.Price.Value));
        if (request.Bedrooms.HasValue) updates.Add(update.Set(item => item.Bedrooms, request.Bedrooms.Value));
        if (request.Bathrooms.HasValue) updates.Add(update.Set(item => item.Bathrooms, request.Bathrooms.Value));
        if (request.Sqft.HasValue) updates.Add(update.Set(item => item.Sqft, request.Sqft.Value));
        if (request.Latitude.HasValue) updates.Add(update.Set(item => item.Latitude, request.Latitude.Value));
        if (request.Longitude.HasValue) updates.Add(update.Set(item => item.Longitude, request.Longitude.Value));
        if (request.ListedDate.HasValue)
        {
            var listedDate = DateTime.SpecifyKind(request.ListedDate.Value, DateTimeKind.Utc);
            updates.Add(update.Set(item => item.ListedDate, listedDate));
        }
        if (request.Status is not null) updates.Add(update.Set(item => item.Status, request.Status));
        if (request.Description is not null) updates.Add(update.Set(item => item.Description, request.Description));

        updates.Add(update.Set(item => item.AggregatedAt, DateTime.UtcNow));
        var options = new FindOneAndUpdateOptions<Listing> { ReturnDocument = ReturnDocument.After };
        return await Collection.FindOneAndUpdateAsync(
            item => item.Id == id,
            update.Combine(updates),
            options,
            cancellationToken);
    }

    public async Task<bool> DeleteAsync(string id, CancellationToken cancellationToken)
    {
        if (_useMockData)
        {
            return _mockListings.RemoveAll(item => item.Id == id) > 0;
        }

        var result = await Collection.DeleteOneAsync(item => item.Id == id, cancellationToken);
        return result.DeletedCount > 0;
    }

    public async Task<ListingStats> GetStatsAsync(CancellationToken cancellationToken)
    {
        if (_useMockData)
        {
            return GetMockStats();
        }

        var summaryPipeline = new[]
        {
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", BsonNull.Value },
                { "totalListings", new BsonDocument("$sum", 1) },
                { "averagePrice", new BsonDocument("$avg", "$price") },
                { "totalValue", new BsonDocument("$sum", "$price") },
                { "averageBedrooms", new BsonDocument("$avg", "$bedrooms") },
                { "averageBathrooms", new BsonDocument("$avg", "$bathrooms") },
                { "averageSqft", new BsonDocument("$avg", "$sqft") }
            })
        };

        var citiesPipeline = new[]
        {
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", new BsonDocument { { "city", "$city" }, { "state", "$state" } } },
                { "count", new BsonDocument("$sum", 1) }
            })
        };

        var summaryTask = Collection.Aggregate<BsonDocument>(summaryPipeline).FirstOrDefaultAsync(cancellationToken);
        var sourcesTask = GroupCountAsync("source", cancellationToken);
        var statusesTask = GroupCountAsync("status", cancellationToken);
        var citiesTask = Collection.Aggregate<BsonDocument>(citiesPipeline).ToListAsync(cancellationToken);
        await Task.WhenAll(summaryTask, sourcesTask, statusesTask, citiesTask);

        var cityCounts = citiesTask.Result.ToDictionary(
            document => $"{document["_id"]["city"].AsString}, {document["_id"]["state"].AsString}",
            document => document["count"].ToInt64());
        var summary = summaryTask.Result;

        return new ListingStats(
            summary is null ? 0 : summary["totalListings"].ToInt64(),
            ReadDouble(summary, "averagePrice"),
            ReadDouble(summary, "totalValue"),
            ReadDouble(summary, "averageBedrooms"),
            ReadDouble(summary, "averageBathrooms"),
            ReadDouble(summary, "averageSqft"),
            sourcesTask.Result,
            statusesTask.Result,
            cityCounts);
    }

    public async Task SeedIfEmptyAsync(string samplePath, CancellationToken cancellationToken)
    {
        if (!_useMockData &&
            await Collection.CountDocumentsAsync(FilterDefinition<Listing>.Empty, cancellationToken: cancellationToken) > 0)
        {
            Console.WriteLine("Connected to MongoDB.");
            return;
        }

        if (!File.Exists(samplePath))
        {
            return;
        }

        var json = await File.ReadAllTextAsync(samplePath, cancellationToken);
        var samples = System.Text.Json.JsonSerializer.Deserialize<List<Listing>>(
            json,
            new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web)
            {
                PropertyNameCaseInsensitive = true
            }) ?? [];

        foreach (var listing in samples)
        {
            listing.ListedDate = DateTime.SpecifyKind(listing.ListedDate, DateTimeKind.Utc);
            listing.AggregatedAt = listing.ListedDate;
        }

        if (_useMockData)
        {
            _mockListings = samples;
            Console.WriteLine($"Using in-memory mock listings ({_mockListings.Count} loaded).");
            return;
        }

        if (samples.Count > 0)
        {
            await Collection.InsertManyAsync(samples, cancellationToken: cancellationToken);
        }
        Console.WriteLine($"Connected to MongoDB; seeded {samples.Count} sample listings.");
    }

    private async Task<Dictionary<string, long>> GroupCountAsync(string field, CancellationToken cancellationToken)
    {
        var pipeline = new[]
        {
            new BsonDocument("$group", new BsonDocument
            {
                { "_id", $"${field}" },
                { "count", new BsonDocument("$sum", 1) }
            })
        };
        var groups = await Collection.Aggregate<BsonDocument>(pipeline).ToListAsync(cancellationToken);
        return groups.ToDictionary(group => group["_id"].AsString, group => group["count"].ToInt64());
    }

    private IMongoCollection<Listing> Collection =>
        _collection ?? throw new InvalidOperationException("MongoDB collection is not configured.");

    private List<Listing> GetMockMatching(ListingFilter filter)
    {
        IEnumerable<Listing> matches = _mockListings;
        if (!string.IsNullOrWhiteSpace(filter.Source)) matches = matches.Where(item => item.Source == filter.Source);
        if (!string.IsNullOrWhiteSpace(filter.City)) matches = matches.Where(item => string.Equals(item.City, filter.City, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(filter.State)) matches = matches.Where(item => string.Equals(item.State, filter.State, StringComparison.OrdinalIgnoreCase));
        if (!string.IsNullOrWhiteSpace(filter.Status)) matches = matches.Where(item => item.Status == filter.Status);
        if (filter.MinPrice.HasValue) matches = matches.Where(item => item.Price >= filter.MinPrice.Value);
        if (filter.MaxPrice.HasValue) matches = matches.Where(item => item.Price <= filter.MaxPrice.Value);
        if (filter.MinSqft.HasValue) matches = matches.Where(item => item.Sqft >= filter.MinSqft.Value);
        if (filter.MaxSqft.HasValue) matches = matches.Where(item => item.Sqft <= filter.MaxSqft.Value);
        if (filter.MinBeds.HasValue) matches = matches.Where(item => item.Bedrooms >= filter.MinBeds.Value);
        if (filter.MaxBeds.HasValue) matches = matches.Where(item => item.Bedrooms <= filter.MaxBeds.Value);
        if (filter.MinBaths.HasValue) matches = matches.Where(item => item.Bathrooms >= filter.MinBaths.Value);
        if (filter.MaxBaths.HasValue) matches = matches.Where(item => item.Bathrooms <= filter.MaxBaths.Value);

        if (filter.TargetBudget.HasValue)
        {
            var rangePercent = Math.Clamp(filter.BudgetRangePercent ?? 20, 0, 50);
            var maximumTargetPrice = filter.TargetBudget.Value * (1 + rangePercent / 100);
            matches = matches.Where(item => item.Price <= maximumTargetPrice);
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            matches = matches.Where(item =>
                item.Address.Contains(filter.SearchTerm, StringComparison.OrdinalIgnoreCase) ||
                item.City.Contains(filter.SearchTerm, StringComparison.OrdinalIgnoreCase) ||
                item.Description.Contains(filter.SearchTerm, StringComparison.OrdinalIgnoreCase));
        }

        IOrderedEnumerable<Listing>? ordered = null;
        if (filter.TargetBudget.HasValue || filter.MinPrice.HasValue || filter.MaxPrice.HasValue)
            ordered = matches.OrderByDescending(item => item.Price);
        if (filter.MinSqft.HasValue || filter.MaxSqft.HasValue)
            ordered = ordered is null ? matches.OrderByDescending(item => item.Sqft) : ordered.ThenByDescending(item => item.Sqft);
        if (filter.MinBeds.HasValue || filter.MaxBeds.HasValue)
            ordered = ordered is null ? matches.OrderByDescending(item => item.Bedrooms) : ordered.ThenByDescending(item => item.Bedrooms);
        if (filter.MinBaths.HasValue || filter.MaxBaths.HasValue)
            ordered = ordered is null ? matches.OrderByDescending(item => item.Bathrooms) : ordered.ThenByDescending(item => item.Bathrooms);

        ordered = ordered is null
            ? matches.OrderByDescending(item => item.AggregatedAt)
            : ordered.ThenByDescending(item => item.AggregatedAt);

        return ordered
            .ThenBy(item => item.Id, StringComparer.Ordinal)
            .ToList();
    }

    private ListingStats GetMockStats()
    {
        var count = _mockListings.Count;
        var bySource = _mockListings.GroupBy(item => item.Source).ToDictionary(group => group.Key, group => (long)group.Count());
        var byStatus = _mockListings.GroupBy(item => item.Status).ToDictionary(group => group.Key, group => (long)group.Count());
        var byCity = _mockListings
            .GroupBy(item => $"{item.City}, {item.State}")
            .ToDictionary(group => group.Key, group => (long)group.Count());

        return new ListingStats(
            count,
            count == 0 ? 0 : _mockListings.Average(item => item.Price),
            _mockListings.Sum(item => item.Price),
            count == 0 ? 0 : _mockListings.Average(item => item.Bedrooms),
            count == 0 ? 0 : _mockListings.Average(item => item.Bathrooms),
            count == 0 ? 0 : _mockListings.Average(item => item.Sqft),
            bySource,
            byStatus,
            byCity);
    }

    private static void ApplyUpdates(Listing listing, ListingUpdateRequest request)
    {
        if (request.Source is not null) listing.Source = request.Source;
        if (request.Address is not null) listing.Address = request.Address;
        if (request.City is not null) listing.City = request.City;
        if (request.State is not null) listing.State = request.State;
        if (request.Zip is not null) listing.Zip = request.Zip;
        if (request.Price.HasValue) listing.Price = request.Price.Value;
        if (request.Bedrooms.HasValue) listing.Bedrooms = request.Bedrooms.Value;
        if (request.Bathrooms.HasValue) listing.Bathrooms = request.Bathrooms.Value;
        if (request.Sqft.HasValue) listing.Sqft = request.Sqft.Value;
        if (request.Latitude.HasValue) listing.Latitude = request.Latitude.Value;
        if (request.Longitude.HasValue) listing.Longitude = request.Longitude.Value;
        if (request.ListedDate.HasValue) listing.ListedDate = DateTime.SpecifyKind(request.ListedDate.Value, DateTimeKind.Utc);
        if (request.Status is not null) listing.Status = request.Status;
        if (request.Description is not null) listing.Description = request.Description;
    }

    private static FilterDefinition<Listing> BuildFilter(ListingFilter filter)
    {
        var builder = Builders<Listing>.Filter;
        var filters = new List<FilterDefinition<Listing>>();

        if (!string.IsNullOrWhiteSpace(filter.Source)) filters.Add(builder.Eq(item => item.Source, filter.Source));
        if (!string.IsNullOrWhiteSpace(filter.City)) filters.Add(ExactMatch(item => item.City, filter.City));
        if (!string.IsNullOrWhiteSpace(filter.State)) filters.Add(ExactMatch(item => item.State, filter.State));
        if (!string.IsNullOrWhiteSpace(filter.Status)) filters.Add(builder.Eq(item => item.Status, filter.Status));
        if (filter.MinPrice.HasValue) filters.Add(builder.Gte(item => item.Price, filter.MinPrice.Value));
        if (filter.MaxPrice.HasValue) filters.Add(builder.Lte(item => item.Price, filter.MaxPrice.Value));
        if (filter.MinSqft.HasValue) filters.Add(builder.Gte(item => item.Sqft, filter.MinSqft.Value));
        if (filter.MaxSqft.HasValue) filters.Add(builder.Lte(item => item.Sqft, filter.MaxSqft.Value));
        if (filter.MinBeds.HasValue) filters.Add(builder.Gte(item => item.Bedrooms, filter.MinBeds.Value));
        if (filter.MaxBeds.HasValue) filters.Add(builder.Lte(item => item.Bedrooms, filter.MaxBeds.Value));
        if (filter.MinBaths.HasValue) filters.Add(builder.Gte(item => item.Bathrooms, filter.MinBaths.Value));
        if (filter.MaxBaths.HasValue) filters.Add(builder.Lte(item => item.Bathrooms, filter.MaxBaths.Value));

        if (filter.TargetBudget.HasValue)
        {
            var rangePercent = Math.Clamp(filter.BudgetRangePercent ?? 20, 0, 50);
            var maximumTargetPrice = filter.TargetBudget.Value * (1 + rangePercent / 100);
            filters.Add(builder.Lte(item => item.Price, maximumTargetPrice));
        }

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            var expression = new BsonRegularExpression(Regex.Escape(filter.SearchTerm), "i");
            filters.Add(builder.Or(
                builder.Regex(item => item.Address, expression),
                builder.Regex(item => item.City, expression),
                builder.Regex(item => item.Description, expression)));
        }

        return filters.Count == 0 ? builder.Empty : builder.And(filters);
    }

    private static FilterDefinition<Listing> ExactMatch(
        System.Linq.Expressions.Expression<Func<Listing, string>> field,
        string value)
    {
        var expression = new BsonRegularExpression($"^{Regex.Escape(value)}$", "i");
        var fieldDefinition = new ExpressionFieldDefinition<Listing, string>(field);
        return Builders<Listing>.Filter.Regex(fieldDefinition, expression);
    }

    private static SortDefinition<Listing> BuildSort(ListingFilter filter)
    {
        var builder = Builders<Listing>.Sort;
        var sorts = new List<SortDefinition<Listing>>();

        if (filter.TargetBudget.HasValue || filter.MinPrice.HasValue || filter.MaxPrice.HasValue)
        {
            sorts.Add(builder.Descending(item => item.Price));
        }
        if (filter.MinSqft.HasValue || filter.MaxSqft.HasValue)
        {
            sorts.Add(builder.Descending(item => item.Sqft));
        }
        if (filter.MinBeds.HasValue || filter.MaxBeds.HasValue)
        {
            sorts.Add(builder.Descending(item => item.Bedrooms));
        }
        if (filter.MinBaths.HasValue || filter.MaxBaths.HasValue)
        {
            sorts.Add(builder.Descending(item => item.Bathrooms));
        }

        sorts.Add(builder.Descending(item => item.AggregatedAt));
        sorts.Add(builder.Ascending(item => item.Id));
        return builder.Combine(sorts);
    }

    private static void ValidateRanges(ListingFilter filter)
    {
        if (filter.MinPrice > filter.MaxPrice) throw new InvalidFilterRangeException("price");
        if (filter.MinSqft > filter.MaxSqft) throw new InvalidFilterRangeException("square feet");
        if (filter.MinBeds > filter.MaxBeds) throw new InvalidFilterRangeException("bedrooms");
        if (filter.MinBaths > filter.MaxBaths) throw new InvalidFilterRangeException("bathrooms");
    }

    private static double ReadDouble(BsonDocument? document, string name) =>
        document is not null && document.TryGetValue(name, out var value) && !value.IsBsonNull
            ? value.ToDouble()
            : 0;
}