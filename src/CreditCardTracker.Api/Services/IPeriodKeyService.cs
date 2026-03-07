using CreditCardTracker.Api.Models;

namespace CreditCardTracker.Api.Services;

public interface IPeriodKeyService
{
    string GetCurrentPeriodKey(BenefitFrequency frequency, DateTime? referenceDate = null);
}
