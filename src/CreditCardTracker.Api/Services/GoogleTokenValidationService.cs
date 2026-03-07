using System.Text.Json;

namespace CreditCardTracker.Api.Services;

public interface IGoogleTokenValidationService
{
    Task<GoogleTokenPayload?> ValidateTokenAsync(string idToken, string expectedClientId, CancellationToken ct = default);
}

public class GoogleTokenPayload
{
    public string Sub { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Name { get; set; }
}

public class GoogleTokenValidationService : IGoogleTokenValidationService
{
    private readonly IHttpClientFactory _httpClientFactory;

    public GoogleTokenValidationService(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<GoogleTokenPayload?> ValidateTokenAsync(string idToken, string expectedClientId, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient();
        var response = await client.GetAsync(
            $"https://oauth2.googleapis.com/tokeninfo?id_token={Uri.EscapeDataString(idToken)}", ct);
        if (!response.IsSuccessStatusCode)
            return null;
        var json = await response.Content.ReadAsStringAsync(ct);
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var aud = root.TryGetProperty("aud", out var audProp) ? audProp.GetString() : null;
        if (aud != expectedClientId)
            return null;
        return new GoogleTokenPayload
        {
            Sub = root.TryGetProperty("sub", out var sub) ? sub.GetString() ?? "" : "",
            Email = root.TryGetProperty("email", out var email) ? email.GetString() ?? "" : "",
            Name = root.TryGetProperty("name", out var name) ? name.GetString() : null
        };
    }
}
