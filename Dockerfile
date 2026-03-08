# Root Dockerfile for Render.com (and other hosts that expect Dockerfile at repo root)
# Builds the .NET API from src/CreditCardTracker.Api

# Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY src/CreditCardTracker.Api/CreditCardTracker.Api.csproj src/CreditCardTracker.Api/
RUN dotnet restore src/CreditCardTracker.Api/CreditCardTracker.Api.csproj
COPY src/CreditCardTracker.Api src/CreditCardTracker.Api
RUN dotnet publish src/CreditCardTracker.Api/CreditCardTracker.Api.csproj -c Release -o /app/publish --no-restore

# Run
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://0.0.0.0:8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "CreditCardTracker.Api.dll"]
