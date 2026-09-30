using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ListingsApi.Models;

public sealed class Listing
{
    [BsonId]
    [BsonRepresentation(BsonType.String)]
    public string Id { get; set; } = string.Empty;

    [BsonElement("source")]
    public string Source { get; set; } = string.Empty;

    [BsonElement("address")]
    public string Address { get; set; } = string.Empty;

    [BsonElement("city")]
    public string City { get; set; } = string.Empty;

    [BsonElement("state")]
    public string State { get; set; } = string.Empty;

    [BsonElement("zip")]
    public string Zip { get; set; } = string.Empty;

    [BsonElement("price")]
    public double Price { get; set; }

    [BsonElement("bedrooms")]
    public double Bedrooms { get; set; }

    [BsonElement("bathrooms")]
    public double Bathrooms { get; set; }

    [BsonElement("sqft")]
    public double Sqft { get; set; }

    [BsonElement("latitude")]
    public double Latitude { get; set; }

    [BsonElement("longitude")]
    public double Longitude { get; set; }

    [BsonElement("listedDate")]
    public DateTime ListedDate { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = "active";

    [BsonElement("description")]
    public string Description { get; set; } = string.Empty;

    [BsonElement("aggregatedAt")]
    public DateTime AggregatedAt { get; set; } = DateTime.UtcNow;
}