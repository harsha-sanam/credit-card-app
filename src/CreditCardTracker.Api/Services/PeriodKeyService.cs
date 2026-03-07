using CreditCardTracker.Api.Models;

namespace CreditCardTracker.Api.Services;

public class PeriodKeyService : IPeriodKeyService
{
    public string GetCurrentPeriodKey(BenefitFrequency frequency, DateTime? referenceDate = null)
    {
        var date = referenceDate ?? DateTime.UtcNow;

        return frequency switch
        {
            BenefitFrequency.Monthly => date.ToString("yyyy-MM"),
            BenefitFrequency.HalfYearly => $"{date.Year}-H{(date.Month <= 6 ? 1 : 2)}",
            BenefitFrequency.Quarterly => $"{date.Year}-Q{(date.Month - 1) / 3 + 1}",
            BenefitFrequency.Yearly => date.Year.ToString(),
            BenefitFrequency.CalendarYear => date.Year.ToString(),
            _ => date.Year.ToString()
        };
    }
}
