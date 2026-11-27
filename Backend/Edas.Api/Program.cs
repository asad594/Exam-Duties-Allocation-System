using System.Text.Json.Serialization;
using Edas.Api.Data;
using Edas.Api.Dtos;
using Edas.Api.Hubs;
using Edas.Api.Middleware;
using Edas.Api.Models;
using Edas.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var jwt = builder.Configuration.GetSection("Jwt").Get<JwtOptions>()!;

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseMySql(builder.Configuration.GetConnectionString("Edas"), new MySqlServerVersion(new Version(8, 0, 36))));
builder.Services.AddControllers().AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new()
    {
        ValidIssuer = jwt.Issuer,
        ValidAudience = jwt.Audience,
        IssuerSigningKey = jwt.SigningKey,
        ClockSkew = TimeSpan.Zero
    };
    // Browsers cannot set headers on WebSocket requests, so SignalR sends the token in the query string.
    o.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                context.Token = context.Request.Query["access_token"];
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddSignalR();

builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<IPasswordHasher<Staff>, PasswordHasher<Staff>>();
builder.Services.AddSingleton<TokenService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<RosterService>();
builder.Services.AddScoped<AllocationService>();
builder.Services.AddScoped<RosterQueryService>();
builder.Services.AddScoped<LeaveService>();
builder.Services.AddScoped(typeof(CrudService<,,>));
builder.Services.AddSingleton<ICrudMap<Staff, StaffDto, StaffInput>, StaffMap>();
builder.Services.AddSingleton<ICrudMap<Course, CourseDto, CourseInput>, CourseMap>();
builder.Services.AddSingleton<ICrudMap<Room, RoomDto, RoomInput>, RoomMap>();
builder.Services.AddSingleton<ICrudMap<ExamSession, SessionDto, SessionInput>, SessionMap>();
builder.Services.AddSingleton<ICrudMap<Slot, SlotDto, SlotInput>, SlotMap>();
builder.Services.AddSingleton<ICrudMap<Unavailability, UnavailabilityDto, UnavailabilityInput>, UnavailabilityMap>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
    Seeder.Run(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<Staff>>(), app.Configuration["SEED_LARGE"] == "1");
}

app.UseMiddleware<ErrorMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<NotificationHub>("/hubs/notifications");
app.Run();
