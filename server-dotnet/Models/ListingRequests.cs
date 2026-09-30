namespace ListingsApi.Models;

public sealed class ListingFilter
{
    public string? Source { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? Status { get; init; }
    public double? MinPrice { get; init; }
    public double? MaxPrice { get; init; }
    public double? MinSqft { get; init; }
    public double? MaxSqft { get; init; }
    public double? MinBeds { get; init; }
    public double? MaxBeds { get; init; }
    public double? MinBaths { get; init; }
    public double? MaxBaths { get; init; }
    public double? TargetBudget { get; init; }
    public double? BudgetRangePercent { get; init; }
    public string? SearchTerm { get; init; }
}

public sealed class ListingCreateRequest
{
    public string? Source { get; init; }
    public string? Address { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? Zip { get; init; }
    public double? Price { get; init; }
    public double? Bedrooms { get; init; }
    public double? Bathrooms { get; init; }
    public double? Sqft { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public DateTime? ListedDate { get; init; }
    public string? Status { get; init; }
    public string? Description { get; init; }
}

public sealed class ListingUpdateRequest
{
    public string? Source { get; init; }
    public string? Address { get; init; }
    public string? City { get; init; }
    public string? State { get; init; }
    public string? Zip { get; init; }
    public double? Price { get; init; }
    public double? Bedrooms { get; init; }
    public double? Bathrooms { get; init; }
    public double? Sqft { get; init; }
    public double? Latitude { get; init; }
    public double? Longitude { get; init; }
    public DateTime? ListedDate { get; init; }
    public string? Status { get; init; }
    public string? Description { get; init; }
}

public sealed class MongoDbSettings
{
    public string ConnectionString { get; init; } = "mongodb://localhost:27017";
    public string DatabaseName { get; init; } = "listings";
    public string CollectionName { get; init; } = "listings";
}

public sealed record PaginatedListings(
    IReadOnlyList<Listing> Data,
    long Count,
    int Page,
    int PageSize,
    int TotalPages);

public sealed record ListingStats(
    long TotalListings,
    double AveragePrice,
    double TotalValue,
    double AverageBedrooms,
    double AverageBathrooms,
    double AverageSqft,
    Dictionary<string, long> BySource,
    Dictionary<string, long> ByStatus,
    Dictionary<string, long> ByCity);

public sealed class InvalidFilterRangeException(string field)
    : Exception($"Minimum {field} cannot be greater than maximum {field}.")
{
    public int Code => 100;
}