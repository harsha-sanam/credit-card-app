using CreditCardTracker.Api.Models;
using CreditCardTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

namespace CreditCardTracker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IGoogleTokenValidationService _tokenValidation;
    private readonly IMongoDbService _db;
    private readonly IConfiguration _config;

    public AuthController(IGoogleTokenValidationService tokenValidation, IMongoDbService db, IConfiguration config)
    {
        _tokenValidation = tokenValidation;
        _db = db;
        _config = config;
    }

    [HttpPost("google")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> GoogleLogin([FromBody] GoogleTokenRequest request, CancellationToken ct)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.IdToken))
                return BadRequest(new { message = "IdToken is required." });
            var clientId = _config["Google:ClientId"];
            if (string.IsNullOrEmpty(clientId))
                return StatusCode(500, new { message = "Google:ClientId is not configured." });
            var payload = await _tokenValidation.ValidateTokenAsync(request.IdToken, clientId, ct);
            if (payload == null || string.IsNullOrEmpty(payload.Sub))
                return Unauthorized(new { message = "Invalid or expired Google token." });
            var adminEmails = _config["Admin:AllowedAdminEmails"]?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                ?? Array.Empty<string>();
            var profile = await _db.UpsertUserProfileAsync(payload.Sub, payload.Email, payload.Name, ct);
            return Ok(new AuthResponse
            {
                UserId = profile.GoogleSubId,
                Email = profile.Email,
                DisplayName = profile.DisplayName,
                IsAdmin = adminEmails.Contains(profile.Email, StringComparer.OrdinalIgnoreCase)
            });
        }
        catch (MongoConnectionException ex)
        {
            return StatusCode(503, new
            {
                message = "Database unavailable. Start MongoDB (e.g. brew services start mongodb-community on macOS).",
                detail = ex.Message
            });
        }
        catch (MongoException ex)
        {
            return StatusCode(503, new
            {
                message = "Database unavailable. Start MongoDB (e.g. brew services start mongodb-community on macOS).",
                detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Server error. Ensure MongoDB is running.", detail = ex.Message });
        }
    }
}
