using CreditCardTracker.Api.Models;
using MongoDB.Bson;
using MongoDB.Driver;

namespace CreditCardTracker.Api.Services;

public class MongoDbService : IMongoDbService
{
    private readonly IMongoDatabase _database;
    private readonly IMongoCollection<UserProfile> _userProfiles;
    private readonly IMongoCollection<MasterCard> _masterCards;
    private readonly IMongoCollection<UserCard> _userCards;

    public MongoDbService(IConfiguration configuration)
    {
        var connectionString = configuration["MongoDb:ConnectionString"] ?? "mongodb://localhost:27017";
        var databaseName = configuration["MongoDb:DatabaseName"] ?? "CreditCardTracker";
        var client = new MongoClient(connectionString);
        _database = client.GetDatabase(databaseName);
        _userProfiles = _database.GetCollection<UserProfile>("UserProfiles");
        _masterCards = _database.GetCollection<MasterCard>("MasterCards");
        _userCards = _database.GetCollection<UserCard>("UserCards");
        CreateIndexesAsync().GetAwaiter().GetResult();
    }

    private async Task CreateIndexesAsync()
    {
        try
        {
            await _userProfiles.Indexes.CreateOneAsync(
                new CreateIndexModel<UserProfile>(Builders<UserProfile>.IndexKeys.Ascending(x => x.GoogleSubId),
                    new CreateIndexOptions { Unique = true }));
            // Non-unique index on UserId for faster queries (users can have multiple cards of same type)
            await _userCards.Indexes.CreateOneAsync(
                new CreateIndexModel<UserCard>(Builders<UserCard>.IndexKeys.Ascending(x => x.UserId),
                    new CreateIndexOptions { Unique = false }));
        }
        catch
        {
            // Index may already exist or other transient error
        }
    }

    public async Task<UserProfile?> GetUserByGoogleSubIdAsync(string googleSubId, CancellationToken ct = default)
    {
        return await _userProfiles.Find(x => x.GoogleSubId == googleSubId).FirstOrDefaultAsync(ct);
    }

    public async Task<UserProfile> UpsertUserProfileAsync(string googleSubId, string email, string? displayName, CancellationToken ct = default)
    {
        var existing = await GetUserByGoogleSubIdAsync(googleSubId, ct);
        if (existing != null)
        {
            var update = Builders<UserProfile>.Update
                .Set(x => x.Email, email)
                .Set(x => x.DisplayName, displayName ?? existing.DisplayName);
            await _userProfiles.UpdateOneAsync(x => x.GoogleSubId == googleSubId, update, cancellationToken: ct);
            existing.Email = email;
            existing.DisplayName = displayName ?? existing.DisplayName;
            return existing;
        }
        var profile = new UserProfile
        {
            Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
            GoogleSubId = googleSubId,
            Email = email,
            DisplayName = displayName
        };
        await _userProfiles.InsertOneAsync(profile, cancellationToken: ct);
        return profile;
    }

    public async Task<List<MasterCard>> GetMasterCardsAsync(CancellationToken ct = default)
    {
        return await _masterCards.Find(FilterDefinition<MasterCard>.Empty).ToListAsync(ct);
    }

    public async Task<MasterCard?> GetMasterCardByIdAsync(string id, CancellationToken ct = default)
    {
        return await _masterCards.Find(x => x.Id == id).FirstOrDefaultAsync(ct);
    }

    public async Task<MasterCard> CreateMasterCardAsync(MasterCard card, CancellationToken ct = default)
    {
        card.Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString();
        await _masterCards.InsertOneAsync(card, cancellationToken: ct);
        return card;
    }

    public async Task<bool> UpdateMasterCardAsync(MasterCard card, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(card.Id)) return false;
        // Debug: check if the card exists first
        var existing = await GetMasterCardByIdAsync(card.Id, ct);
        Console.WriteLine($"[UpdateMasterCard] Looking for Id={card.Id}, Found={existing != null}");
        if (existing == null)
        {
            // List all cards to see what IDs exist
            var all = await GetMasterCardsAsync(ct);
            Console.WriteLine($"[UpdateMasterCard] All card IDs: {string.Join(", ", all.Select(c => c.Id))}");
            return false;
        }
        var result = await _masterCards.ReplaceOneAsync(x => x.Id == card.Id, card, cancellationToken: ct);
        Console.WriteLine($"[UpdateMasterCard] ReplaceOne MatchedCount={result.MatchedCount}, ModifiedCount={result.ModifiedCount}");
        return result.MatchedCount > 0;
    }

    public async Task<bool> DeleteMasterCardAsync(string id, CancellationToken ct = default)
    {
        var result = await _masterCards.DeleteOneAsync(x => x.Id == id, ct);
        return result.DeletedCount > 0;
    }

    public async Task<List<UserCard>> GetUserCardsAsync(string userId, CancellationToken ct = default)
    {
        return await _userCards.Find(x => x.UserId == userId).ToListAsync(ct);
    }

    public async Task<UserCard?> GetUserCardByIdAsync(string id, string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(id) || string.IsNullOrEmpty(userId) || !ObjectId.TryParse(id, out _))
            return null;
        var filter = Builders<UserCard>.Filter.And(
            Builders<UserCard>.Filter.Eq("_id", new ObjectId(id)),
            Builders<UserCard>.Filter.Eq(x => x.UserId, userId));
        return await _userCards.Find(filter).FirstOrDefaultAsync(ct);
    }

    public async Task<UserCard?> GetUserCardByUserAndMasterAsync(string userId, string masterCardId, CancellationToken ct = default)
    {
        return await _userCards.Find(x => x.UserId == userId && x.MasterCardId == masterCardId).FirstOrDefaultAsync(ct);
    }

    public async Task<UserCard> AddCardToWalletAsync(string userId, string masterCardId, string cardName, DateTime? anniversaryDate, CancellationToken ct = default)
    {
        // Allow multiple cards of the same type (no uniqueness check)
        var userCard = new UserCard
        {
            Id = MongoDB.Bson.ObjectId.GenerateNewId().ToString(),
            UserId = userId,
            MasterCardId = masterCardId,
            CardName = cardName,
            CreatedAt = DateTime.UtcNow,
            AnniversaryDate = anniversaryDate,
            BenefitUsages = new List<UsageRecord>()
        };
        await _userCards.InsertOneAsync(userCard, cancellationToken: ct);
        return userCard;
    }

    public async Task<bool> RemoveCardFromWalletAsync(string userCardId, string userId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(userCardId) || string.IsNullOrEmpty(userId) || !ObjectId.TryParse(userCardId, out _))
            return false;
        var filter = Builders<UserCard>.Filter.And(
            Builders<UserCard>.Filter.Eq("_id", new ObjectId(userCardId)),
            Builders<UserCard>.Filter.Eq(x => x.UserId, userId));
        var result = await _userCards.DeleteOneAsync(filter, ct);
        return result.DeletedCount > 0;
    }

    public async Task<bool> ClaimBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default)
    {
        var userCard = await GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return false;
        var existing = userCard.BenefitUsages.FirstOrDefault(u => u.BenefitId == benefitId && u.CurrentPeriodKey == periodKey);
        var newRecord = new UsageRecord
        {
            BenefitId = benefitId,
            LastUsedDate = DateTime.UtcNow,
            CurrentPeriodKey = periodKey
        };
        if (existing != null)
        {
            userCard.BenefitUsages.Remove(existing);
        }
        userCard.BenefitUsages.Add(newRecord);
        var result = await _userCards.ReplaceOneAsync(x => x.Id == userCardId && x.UserId == userId, userCard, cancellationToken: ct);
        return result.ModifiedCount > 0;
    }

    public async Task<bool> UnclaimBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default)
    {
        var userCard = await GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return false;
        var existing = userCard.BenefitUsages.FirstOrDefault(u => u.BenefitId == benefitId && u.CurrentPeriodKey == periodKey);
        if (existing == null) return false;
        userCard.BenefitUsages.Remove(existing);
        var result = await _userCards.ReplaceOneAsync(x => x.Id == userCardId && x.UserId == userId, userCard, cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<bool> DismissBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default)
    {
        var userCard = await GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return false;
        var existing = userCard.DismissedBenefits.FirstOrDefault(d => d.BenefitId == benefitId && d.PeriodKey == periodKey);
        if (existing != null) return true; // Already dismissed
        userCard.DismissedBenefits.Add(new DismissedBenefit
        {
            BenefitId = benefitId,
            PeriodKey = periodKey,
            DismissedAt = DateTime.UtcNow
        });
        var result = await _userCards.ReplaceOneAsync(x => x.Id == userCardId && x.UserId == userId, userCard, cancellationToken: ct);
        return result.MatchedCount > 0;
    }

    public async Task<bool> UndismissBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default)
    {
        var userCard = await GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return false;
        var existing = userCard.DismissedBenefits.FirstOrDefault(d => d.BenefitId == benefitId && d.PeriodKey == periodKey);
        if (existing == null) return true; // Not dismissed
        userCard.DismissedBenefits.Remove(existing);
        var result = await _userCards.ReplaceOneAsync(x => x.Id == userCardId && x.UserId == userId, userCard, cancellationToken: ct);
        return result.MatchedCount > 0;
    }
}
