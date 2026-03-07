using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CreditCardTracker.Api.Models;

public class Benefit
{
    [BsonElement("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;

    [BsonElement("frequency")]
    [BsonRepresentation(BsonType.String)]
    public BenefitFrequency Frequency { get; set; }

    [BsonElement("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Optional overrides per period (e.g. month 12 = December $25 for a monthly benefit).
    /// PeriodSubKey: Monthly = "1".."12", Quarterly = "1".."4", HalfYearly = "1".."2".
    /// </summary>
    [BsonElement("periodValueOverrides")]
    public List<PeriodValueOverride>? PeriodValueOverrides { get; set; }
}
