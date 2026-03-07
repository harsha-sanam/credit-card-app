using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CreditCardTracker.Api.Models;

public class UsageRecord
{
    [BsonElement("benefitId")]
    public string BenefitId { get; set; } = string.Empty;

    [BsonElement("lastUsedDate")]
    public DateTime LastUsedDate { get; set; }

    [BsonElement("currentPeriodKey")]
    public string CurrentPeriodKey { get; set; } = string.Empty;
}
