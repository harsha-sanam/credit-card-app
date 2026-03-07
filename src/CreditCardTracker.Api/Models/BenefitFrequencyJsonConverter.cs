using System.Text.Json;
using System.Text.Json.Serialization;

namespace CreditCardTracker.Api.Models;

/// <summary>
/// Accepts user-friendly strings like "HalfYearly", "Half-Yearly", "Half Yearly".
/// </summary>
public sealed class BenefitFrequencyJsonConverter : JsonConverter<BenefitFrequency>
{
    public override BenefitFrequency Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.String)
        {
            var raw = reader.GetString() ?? string.Empty;
            var normalized = Normalize(raw);

            return normalized switch
            {
                "monthly" => BenefitFrequency.Monthly,
                "halfyearly" or "halfyear" or "semiannual" or "semiannually" => BenefitFrequency.HalfYearly,
                "quarterly" => BenefitFrequency.Quarterly,
                "yearly" or "annual" or "annually" => BenefitFrequency.Yearly,
                "calendaryear" or "calendar" => BenefitFrequency.CalendarYear,
                _ => throw new JsonException($"Invalid BenefitFrequency '{raw}'. Allowed: Monthly, HalfYearly, Quarterly, Yearly, CalendarYear.")
            };
        }

        // Also allow numbers (0..N) if someone sends them
        if (reader.TokenType == JsonTokenType.Number && reader.TryGetInt32(out var n))
        {
            if (Enum.IsDefined(typeof(BenefitFrequency), n))
                return (BenefitFrequency)n;
        }

        throw new JsonException("Invalid BenefitFrequency value.");
    }

    public override void Write(Utf8JsonWriter writer, BenefitFrequency value, JsonSerializerOptions options)
    {
        writer.WriteStringValue(value.ToString());
    }

    private static string Normalize(string input)
    {
        var s = input.Trim();
        Span<char> buffer = stackalloc char[s.Length];
        var j = 0;
        for (var i = 0; i < s.Length; i++)
        {
            var c = s[i];
            if (c is ' ' or '-' or '_' or '/')
                continue;
            buffer[j++] = char.ToLowerInvariant(c);
        }
        return new string(buffer[..j]);
    }
}

