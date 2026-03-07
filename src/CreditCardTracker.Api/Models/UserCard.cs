using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CreditCardTracker.Api.Models;

public class UserCard
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("userId")]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("masterCardId")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string MasterCardId { get; set; } = null!;

    [BsonElement("cardName")]
    public string? CardName { get; set; }

    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("anniversaryDate")]
    public DateTime? AnniversaryDate { get; set; }

    [BsonElement("benefitUsages")]
    public List<UsageRecord> BenefitUsages { get; set; } = new();

    [BsonElement("dismissedBenefits")]
    public List<DismissedBenefit> DismissedBenefits { get; set; } = new();
}

public class DismissedBenefit
{
    [BsonElement("benefitId")]
    public string BenefitId { get; set; } = string.Empty;

    [BsonElement("periodKey")]
    public string PeriodKey { get; set; } = string.Empty;

    [BsonElement("dismissedAt")]
    public DateTime DismissedAt { get; set; } = DateTime.UtcNow;
}
