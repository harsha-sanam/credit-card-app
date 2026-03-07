using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace CreditCardTracker.Api.Models;

public class UserProfile
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = null!;

    [BsonElement("googleSubId")]
    public string GoogleSubId { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    [BsonElement("displayName")]
    public string? DisplayName { get; set; }
}
