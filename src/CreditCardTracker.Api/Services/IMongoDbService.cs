using CreditCardTracker.Api.Models;

namespace CreditCardTracker.Api.Services;

public interface IMongoDbService
{
    Task<UserProfile?> GetUserByGoogleSubIdAsync(string googleSubId, CancellationToken ct = default);
    Task<UserProfile> UpsertUserProfileAsync(string googleSubId, string email, string? displayName, CancellationToken ct = default);
    Task<List<MasterCard>> GetMasterCardsAsync(CancellationToken ct = default);
    Task<MasterCard?> GetMasterCardByIdAsync(string id, CancellationToken ct = default);
    Task<MasterCard> CreateMasterCardAsync(MasterCard card, CancellationToken ct = default);
    Task<bool> UpdateMasterCardAsync(MasterCard card, CancellationToken ct = default);
    Task<bool> DeleteMasterCardAsync(string id, CancellationToken ct = default);
    Task<List<UserCard>> GetUserCardsAsync(string userId, CancellationToken ct = default);
    Task<UserCard?> GetUserCardByIdAsync(string id, string userId, CancellationToken ct = default);
    Task<UserCard?> GetUserCardByUserAndMasterAsync(string userId, string masterCardId, CancellationToken ct = default);
    Task<UserCard> AddCardToWalletAsync(string userId, string masterCardId, string cardName, DateTime? anniversaryDate, CancellationToken ct = default);
    Task<bool> RemoveCardFromWalletAsync(string userCardId, string userId, CancellationToken ct = default);
    Task<bool> ClaimBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default);
    Task<bool> UnclaimBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default);
    Task<bool> DismissBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default);
    Task<bool> UndismissBenefitAsync(string userCardId, string userId, string benefitId, string periodKey, CancellationToken ct = default);
}
