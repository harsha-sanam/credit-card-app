using CreditCardTracker.Api.Models;
using CreditCardTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;


namespace CreditCardTracker.Api.Controllers;

[ApiController]
[Route("api/usercards")]
[Authorize]
public class UserCardsController : ControllerBase
{
    private readonly IMongoDbService _db;
    private readonly IPeriodKeyService _periodKey;

    public UserCardsController(IMongoDbService db, IPeriodKeyService periodKey)
    {
        _db = db;
        _periodKey = periodKey;
    }

    private string? UserId => User.Claims.FirstOrDefault(c => c.Type == "sub" || c.Type == "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier")?.Value;

    [HttpGet]
    public async Task<ActionResult<List<UserCardWithMaster>>> GetMyCards(CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var userCards = await _db.GetUserCardsAsync(userId, ct);
        var result = new List<UserCardWithMaster>();
        foreach (var uc in userCards)
        {
            var master = await _db.GetMasterCardByIdAsync(uc.MasterCardId, ct);
            result.Add(new UserCardWithMaster { UserCard = uc, MasterCard = master });
        }
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserCardWithMaster>> GetById(string id, CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var userCard = await _db.GetUserCardByIdAsync(id, userId, ct);
        if (userCard == null) return NotFound(new { message = "User card not found.", id });
        var master = await _db.GetMasterCardByIdAsync(userCard.MasterCardId, ct);
        return Ok(new UserCardWithMaster { UserCard = userCard, MasterCard = master });
    }

    [HttpPost]
    public async Task<ActionResult<UserCard>> AddToWallet([FromBody] AddCardRequest request, CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        if (string.IsNullOrEmpty(request.MasterCardId)) return BadRequest("MasterCardId is required.");
        var master = await _db.GetMasterCardByIdAsync(request.MasterCardId, ct);
        if (master == null) return NotFound(new { message = "Master card not found.", masterCardId = request.MasterCardId });
        var cardName = string.IsNullOrWhiteSpace(request.CardName) ? master.CardName : request.CardName.Trim();
        var anniversaryDate = master.IsAnniversaryBased ? request.AnniversaryDate : null;
        var userCard = await _db.AddCardToWalletAsync(userId, request.MasterCardId, cardName, anniversaryDate, ct);
        return CreatedAtAction(nameof(GetById), new { id = userCard.Id }, userCard);
    }

    [HttpDelete("remove/{userCardId}")]
    public async Task<ActionResult> RemoveFromWallet(string userCardId, CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized(new { message = "User not authenticated." });

        var existing = await _db.GetUserCardByIdAsync(userCardId, userId, ct);
        if (existing == null) return NotFound(new { message = "User card not found or does not belong to you.", userCardId });

        var ok = await _db.RemoveCardFromWalletAsync(userCardId, userId, ct);
        if (!ok) return StatusCode(500, new { message = "Failed to delete card.", userCardId });
        return NoContent();
    }

    [HttpPost("{userCardId}/benefits/{benefitId}/claim")]
    public async Task<ActionResult> ClaimBenefit(string userCardId, string benefitId, [FromBody] ClaimBenefitRequest? request, CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var userCard = await _db.GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return NotFound(new { message = "User card not found.", userCardId });
        var master = await _db.GetMasterCardByIdAsync(userCard.MasterCardId, ct);
        var benefit = master?.Benefits.FirstOrDefault(b => b.Id == benefitId);
        if (benefit == null) return NotFound(new { message = "Benefit not found.", benefitId });
        var periodKey = string.IsNullOrWhiteSpace(request?.PeriodKey)
            ? _periodKey.GetCurrentPeriodKey(benefit.Frequency)
            : request!.PeriodKey.Trim();

        if (!TryParseAndValidatePeriodKey(periodKey, benefit.Frequency, userCard.CreatedAt, out var error))
            return BadRequest(new { message = error });

        var ok = await _db.ClaimBenefitAsync(userCardId, userId, benefitId, periodKey, ct);
        if (!ok) return StatusCode(500, "Failed to claim benefit.");
        return NoContent();
    }

    [HttpDelete("{userCardId}/benefits/{benefitId}/claim/{periodKey}")]
    public async Task<ActionResult> UnclaimBenefit(string userCardId, string benefitId, string periodKey, CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var userCard = await _db.GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return NotFound(new { message = "User card not found.", userCardId });

        var ok = await _db.UnclaimBenefitAsync(userCardId, userId, benefitId, periodKey, ct);
        if (!ok) return NotFound(new { message = "Usage record not found.", benefitId, periodKey });
        return NoContent();
    }

    [HttpPost("{userCardId}/benefits/{benefitId}/dismiss/{periodKey}")]
    public async Task<ActionResult> DismissBenefit(string userCardId, string benefitId, string periodKey, CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var userCard = await _db.GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return NotFound(new { message = "User card not found.", userCardId });

        var ok = await _db.DismissBenefitAsync(userCardId, userId, benefitId, periodKey, ct);
        if (!ok) return BadRequest(new { message = "Failed to dismiss benefit." });
        return NoContent();
    }

    [HttpDelete("{userCardId}/benefits/{benefitId}/dismiss/{periodKey}")]
    public async Task<ActionResult> UndismissBenefit(string userCardId, string benefitId, string periodKey, CancellationToken ct)
    {
        var userId = UserId;
        if (string.IsNullOrEmpty(userId)) return Unauthorized();
        var userCard = await _db.GetUserCardByIdAsync(userCardId, userId, ct);
        if (userCard == null) return NotFound(new { message = "User card not found.", userCardId });

        var ok = await _db.UndismissBenefitAsync(userCardId, userId, benefitId, periodKey, ct);
        if (!ok) return BadRequest(new { message = "Failed to undismiss benefit." });
        return NoContent();
    }

    private static bool TryParseAndValidatePeriodKey(string periodKey, BenefitFrequency frequency, DateTime cardCreatedAtUtc, out string error)
    {
        error = string.Empty;
        if (string.IsNullOrWhiteSpace(periodKey) || periodKey.Length < 4)
        {
            error = "Invalid periodKey.";
            return false;
        }

        // Parse year prefix
        if (!int.TryParse(periodKey[..4], out var year))
        {
            error = "Invalid periodKey year.";
            return false;
        }

        var now = DateTime.UtcNow;
        var nowYear = now.Year;

        // Allowed years: addedYear and addedYear-1 (entire previous calendar year)
        var addedYear = cardCreatedAtUtc.ToUniversalTime().Year;
        if (year != addedYear && year != addedYear - 1)
        {
            error = $"Out of range. Card added in {addedYear}; allowed years are {addedYear - 1}-{addedYear}.";
            return false;
        }

        // Disallow future years outright
        if (year > nowYear)
        {
            error = "Cannot claim a future period.";
            return false;
        }

        // Validate format and prevent future period within current year.
        switch (frequency)
        {
            case BenefitFrequency.Monthly:
            {
                // YYYY-MM
                if (periodKey.Length != 7 || periodKey[4] != '-' || !int.TryParse(periodKey[5..7], out var m) || m < 1 || m > 12)
                {
                    error = "Invalid periodKey for Monthly. Expected YYYY-MM.";
                    return false;
                }
                if (year == nowYear && m > now.Month)
                {
                    error = "Cannot claim a future month.";
                    return false;
                }
                return true;
            }
            case BenefitFrequency.Quarterly:
            {
                // YYYY-Qn
                if (periodKey.Length != 7 || periodKey[4] != '-' || periodKey[5] != 'Q' || !int.TryParse(periodKey[6..7], out var q) || q < 1 || q > 4)
                {
                    error = "Invalid periodKey for Quarterly. Expected YYYY-Qn.";
                    return false;
                }
                var nowQuarter = (now.Month - 1) / 3 + 1;
                if (year == nowYear && q > nowQuarter)
                {
                    error = "Cannot claim a future quarter.";
                    return false;
                }
                return true;
            }
            case BenefitFrequency.HalfYearly:
            {
                // YYYY-Hn
                if (periodKey.Length != 7 || periodKey[4] != '-' || periodKey[5] != 'H' || !int.TryParse(periodKey[6..7], out var h) || h < 1 || h > 2)
                {
                    error = "Invalid periodKey for HalfYearly. Expected YYYY-Hn.";
                    return false;
                }
                var nowHalf = now.Month <= 6 ? 1 : 2;
                if (year == nowYear && h > nowHalf)
                {
                    error = "Cannot claim a future half-year.";
                    return false;
                }
                return true;
            }
            case BenefitFrequency.Yearly:
            case BenefitFrequency.CalendarYear:
            {
                // YYYY
                if (periodKey.Length != 4)
                {
                    error = "Invalid periodKey for Yearly. Expected YYYY.";
                    return false;
                }
                // If selected year is current year, allow claiming (it represents year-to-date).
                return true;
            }
            default:
                error = "Unsupported benefit frequency.";
                return false;
        }
    }
}

public class UserCardWithMaster
{
    public UserCard UserCard { get; set; } = null!;
    public MasterCard? MasterCard { get; set; }
}

public class AddCardRequest
{
    public string MasterCardId { get; set; } = string.Empty;
    public string? CardName { get; set; }
    public DateTime? AnniversaryDate { get; set; }
}

public class ClaimBenefitRequest
{
    public string? PeriodKey { get; set; }
}
