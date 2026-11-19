using System.ComponentModel.DataAnnotations;
using Edas.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Edas.Api.Middleware;

public sealed class ErrorMiddleware(RequestDelegate next, ILogger<ErrorMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (Exception ex)
        {
            var (status, body) = Map(ex);
            if (status == StatusCodes.Status500InternalServerError) logger.LogError(ex, "Unhandled error");
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(body);
        }
    }

    private static (int, object) Map(Exception ex) => ex switch
    {
        ValidationException => (400, Problem(400, ex.Message)),
        UnauthorizedAccessException => (401, Problem(401, ex.Message)),
        NotFoundException => (404, Problem(404, ex.Message)),
        DbUpdateException => (409, Problem(409, "The change conflicts with existing data (duplicate value or record in use).")),
        RuleException => (422, new { reason = ex.Message }),
        _ => (500, Problem(500, "An unexpected error occurred."))
    };

    private static ProblemDetails Problem(int status, string title) => new() { Status = status, Title = title };
}
