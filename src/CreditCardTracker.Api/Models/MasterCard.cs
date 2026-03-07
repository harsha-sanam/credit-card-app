using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CreditCardTracker.Api.Models;

[BsonIgnoreExtraElements]
public class MasterCard
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("cardName")]
    public string CardName { get; set; } = string.Empty;

    [BsonElement("bank")]
    public string Bank { get; set; } = string.Empty;

    [BsonElement("annualFee")]
    public decimal AnnualFee { get; set; }

    [BsonElement("isAnniversaryBased")]
    public bool IsAnniversaryBased { get; set; } = false;

    [BsonElement("benefits")]
    public List<Benefit> Benefits { get; set; } = new();
}
