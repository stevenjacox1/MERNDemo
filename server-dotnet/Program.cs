using System.Globalization;
using ListingsApi.Models;
using ListingsApi.Services;
using Microsoft.AspNetCore.Http;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);
var mongoSettings = builder.Configuration.GetSection("MongoDb").Get<MongoDbSettings>() ?? new MongoDbSettings();

if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ASPNETCORE_URLS")))
{
    var port = Environment.GetEnvironmentVariable("PORT") ?? "5001";
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.Services.AddSingleton(mongoSettings);
builder.Services.AddSingleton<IMongoClient>(_ => new MongoClient(mongoSettings.ConnectionString));
builder.Services.AddSingleton(serviceProvider =>
    serviceProvider.GetRequiredService<IMongoClient>()
        .GetDatabase(mongoSettings.DatabaseName)
        .GetCollection<Listing>(mongoSettings.CollectionName));
builder.Services.AddSingleton<ListingsService>();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
{
    if (allowedOrigins.Length == 0)
    {
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
    }
    else
    {
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod();
    }
}));

var app = builder.Build();
app.UseCors();

var listingsService = app.Services.GetRequiredService<ListingsService>();
var sampleDataPath = Path.Combine(AppContext.BaseDirectory, "sample_listings.json");
await listingsService.SeedIfEmptyAsync(sampleDataPath, app.Lifetime.ApplicationStopping);

app.MapGet("/api/health", () => Results.Ok(new { status = "OK", timestamp = DateTime.UtcNow }));

app.MapGet("/api/listings", async (
    HttpRequest request,
    ListingsService service,
    CancellationToken cancellationToken) =>
{
    if (!TryBuildFilter(request.Query, out var filter, out var page, out var error))
    {
        return Results.BadRequest(new { success = false, error });
    }

    try
    {
        var result = await service.GetPageAsync(filter, page, cancellationToken);
        return Results.Ok(new
        {
            success = true,
            count = result.Count,
            data = result.Data,
            pagination = new { page = result.Page, pageSize = result.PageSize, totalPages = result.TotalPages }
        });
    }
    catch (InvalidFilterRangeException exception)
    {
        return Results.BadRequest(new
        {
            success = false,
            error = exception.Message,
            errorCode = "Error Code: 100"
        });
    }
});

app.MapGet("/api/listings/source/{source}", async (
    string source,
    ListingsService service,
    CancellationToken cancellationToken) =>
    await ListResponse(service, new ListingFilter { Source = source }, cancellationToken));

app.MapGet("/api/listings/city/{city}", async (
    string city,
    ListingsService service,
    CancellationToken cancellationToken) =>
    await ListResponse(service, new ListingFilter { City = city }, cancellationToken));

app.MapGet("/api/listings/status/{status}", async (
    string status,
    ListingsService service,
    CancellationToken cancellationToken) =>
    await ListResponse(service, new ListingFilter { Status = status }, cancellationToken));

app.MapGet("/api/listings/state/{state}", async (
    string state,
    ListingsService service,
    CancellationToken cancellationToken) =>
    await ListResponse(service, new ListingFilter { State = state }, cancellationToken));

app.MapGet("/api/listings/stats/overview", async (
    ListingsService service,
    CancellationToken cancellationToken) =>
    Results.Ok(new { success = true, data = await service.GetStatsAsync(cancellationToken) }));

app.MapGet("/api/listings/{id}", async (
    string id,
    ListingsService service,
    CancellationToken cancellationToken) =>
{
    var listing = await service.GetByIdAsync(id, cancellationToken);
    return listing is null
        ? Results.NotFound(new { success = false, error = "Listing not found" })
        : Results.Ok(new { success = true, data = listing });
});

app.MapPost("/api/listings", async (
    ListingCreateRequest request,
    ListingsService service,
    CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Source) ||
        string.IsNullOrWhiteSpace(request.Address) ||
        string.IsNullOrWhiteSpace(request.City) ||
        string.IsNullOrWhiteSpace(request.State) ||
        string.IsNullOrWhiteSpace(request.Zip) ||
        !request.Price.HasValue ||
        !request.Bedrooms.HasValue ||
        !request.Bathrooms.HasValue ||
        string.IsNullOrWhiteSpace(request.Description))
    {
        return Results.BadRequest(new
        {
            success = false,
            error = "Missing required fields: source, address, city, state, zip, price, bedrooms, bathrooms, description"
        });
    }

    var listing = await service.AddAsync(request, cancellationToken);
    return Results.Json(new { success = true, data = listing }, statusCode: StatusCodes.Status201Created);
});

app.MapPut("/api/listings/{id}", async (
    string id,
    ListingUpdateRequest request,
    ListingsService service,
    CancellationToken cancellationToken) =>
{
    var listing = await service.UpdateAsync(id, request, cancellationToken);
    return listing is null
        ? Results.NotFound(new { success = false, error = "Listing not found" })
        : Results.Ok(new { success = true, data = listing });
});

app.MapDelete("/api/listings/{id}", async (
    string id,
    ListingsService service,
    CancellationToken cancellationToken) =>
{
    if (!await service.DeleteAsync(id, cancellationToken))
    {
        return Results.NotFound(new { success = false, error = "Listing not found" });
    }

    return Results.Ok(new { success = true, message = "Listing deleted successfully" });
});

app.Run();

static async Task<IResult> ListResponse(
    ListingsService service,
    ListingFilter filter,
    CancellationToken cancellationToken)
{
    var listings = await service.GetMatchingAsync(filter, cancellationToken);
    return Results.Ok(new { success = true, count = listings.Count, data = listings });
}

static bool TryBuildFilter(
    IQueryCollection query,
    out ListingFilter filter,
    out int page,
    out string? error)
{
    filter = new ListingFilter();
    page = 1;
    error = null;

    var numericParameters = new[]
    {
        "minPrice", "maxPrice", "minSqft", "maxSqft", "minBeds",
        "maxBeds", "minBaths", "maxBaths", "targetBudget", "budgetRangePercent"
    };
    var numbers = new Dictionary<string, double?>();

    foreach (var name in numericParameters)
    {
        if (!TryGetNumber(query, name, out var value))
        {
            error = $"Query parameter '{name}' must be a number.";
            return false;
        }
        numbers[name] = value;
    }

    if (query.TryGetValue("page", out var pageText) &&
        !string.IsNullOrWhiteSpace(pageText) &&
        !int.TryParse(pageText, NumberStyles.Integer, CultureInfo.InvariantCulture, out page))
    {
        error = "Query parameter 'page' must be an integer.";
        return false;
    }

    filter = new ListingFilter
    {
        Source = OptionalString(query, "source"),
        City = OptionalString(query, "city"),
        State = OptionalString(query, "state"),
        Status = OptionalString(query, "status"),
        MinPrice = numbers["minPrice"],
        MaxPrice = numbers["maxPrice"],
        MinSqft = numbers["minSqft"],
        MaxSqft = numbers["maxSqft"],
        MinBeds = numbers["minBeds"],
        MaxBeds = numbers["maxBeds"],
        MinBaths = numbers["minBaths"],
        MaxBaths = numbers["maxBaths"],
        TargetBudget = numbers["targetBudget"],
        BudgetRangePercent = numbers["budgetRangePercent"],
        SearchTerm = OptionalString(query, "search")
    };
    return true;
}

static bool TryGetNumber(IQueryCollection query, string name, out double? value)
{
    value = null;
    if (!query.TryGetValue(name, out var text) || string.IsNullOrWhiteSpace(text))
    {
        return true;
    }

    if (!double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed))
    {
        return false;
    }

    value = parsed;
    return true;
}

static string? OptionalString(IQueryCollection query, string name) =>
    query.TryGetValue(name, out var value) && !string.IsNullOrWhiteSpace(value)
        ? value.ToString()
        : null;

