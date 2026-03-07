using MongoDB.Bson.Serialization.Attributes;

namespace CreditCardTracker.Api.Models;

/// <summary>
/// Override for benefit value in a specific period (e.g. December = $25 for monthly Uber).
/// PeriodSubKey: for Monthly = "1".."12", Quarterly = "1".."4", HalfYearly = "1".."2".
/// </summary>
public class PeriodValueOverride
{
    [BsonElement("periodSubKey")]
    public string PeriodSubKey { get; set; } = string.Empty;

    [BsonElement("value")]
    public string Value { get; set; } = string.Empty;
}
