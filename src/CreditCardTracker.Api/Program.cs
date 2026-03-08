using CreditCardTracker.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text.Json.Serialization;
using CreditCardTracker.Api.Models;
using MongoDB.Bson.Serialization;

// Ensure MasterCard BSON element "isAnniversaryBased" is mapped (avoids deserialization errors)
if (!BsonClassMap.IsClassMapRegistered(typeof(MasterCard)))
{
    BsonClassMap.RegisterClassMap<MasterCard>(cm =>
    {
        cm.AutoMap();
        cm.MapMember(c => c.IsAnniversaryBased).SetElementName("isAnniversaryBased");
    });
}

var builder = WebApplication.CreateBuilder(args);

// Use PORT from environment (e.g. Render.com, Fly.io) when set
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

builder.Services.AddHttpClient();
builder.Services.AddSingleton<IGoogleTokenValidationService, GoogleTokenValidationService>();
builder.Services.AddSingleton<IPeriodKeyService, PeriodKeyService>();
builder.Services.AddSingleton<IMongoDbService, MongoDbService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var googleClientId = builder.Configuration["Google:ClientId"];
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = "https://accounts.google.com";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuers = new[] { "https://accounts.google.com", "accounts.google.com" },
            ValidAudience = googleClientId,
            ValidateIssuer = true,
            ValidateAudience = !string.IsNullOrEmpty(googleClientId),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers().AddJsonOptions(options =>
{
    // Accept/emit enums as strings (e.g. "Monthly") to match Angular payloads
    options.JsonSerializerOptions.Converters.Add(new BenefitFrequencyJsonConverter());
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        // Development-only: allow all origins/headers/methods to simplify CORS while you debug
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// CORS must be first to ensure headers are added even on errors
app.UseCors();

app.UseSwagger();
app.UseSwaggerUI();

app.UseAuthentication();
app.UseAuthorization();

// Health check so you can confirm the API is reachable (no auth required)
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", api = "CreditCardTracker" })).AllowAnonymous();

app.MapControllers();

app.Run();
