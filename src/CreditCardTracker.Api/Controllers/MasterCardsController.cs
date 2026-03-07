using System.Security.Claims;
using CreditCardTracker.Api.Models;
using CreditCardTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CreditCardTracker.Api.Controllers;

[ApiController]
[Route("api/mastercards")]
[Authorize]
public class MasterCardsController : ControllerBase
{
    private readonly IMongoDbService _db;
    private readonly IConfiguration _config;

    public MasterCardsController(IMongoDbService db, IConfiguration config)
    {
        _db = db;
        _config = config;
    }

    private string? GetUserEmail()
    {
        // Google ID token can use "email" or .NET-mapped claim type
        var names = new[] { "email", ClaimTypes.Email, "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress" };
        foreach (var name in names)
        {
            var value = User.Claims.FirstOrDefault(c => c.Type == name)?.Value;
            if (!string.IsNullOrEmpty(value)) return value;
        }
        return null;
    }

    private bool IsAdmin()
    {
        var email = GetUserEmail();
        if (string.IsNullOrEmpty(email)) return false;
        var allowed = _config["Admin:AllowedAdminEmails"]?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries) ?? Array.Empty<string>();
        return allowed.Contains(email, StringComparer.OrdinalIgnoreCase);
    }

    [HttpGet]
    public async Task<ActionResult<List<MasterCard>>> GetAll(CancellationToken ct)
    {
        var list = await _db.GetMasterCardsAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MasterCard>> GetById(string id, CancellationToken ct)
    {
        var card = await _db.GetMasterCardByIdAsync(id, ct);
        if (card == null) return NotFound(new { message = "Master card not found.", id });
        return Ok(card);
    }

    [HttpPost]
    public async Task<ActionResult<MasterCard>> Create([FromBody] MasterCard card, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        var created = await _db.CreateMasterCardAsync(card, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(string id, [FromBody] MasterCard card, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        if (id != card.Id) return BadRequest();
        var ok = await _db.UpdateMasterCardAsync(card, ct);
        if (!ok) return NotFound(new { message = "Master card not found for update.", id });
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id, CancellationToken ct)
    {
        if (!IsAdmin()) return Forbid();
        var ok = await _db.DeleteMasterCardAsync(id, ct);
        if (!ok) return NotFound(new { message = "Master card not found for delete.", id });
        return NoContent();
    }
}
