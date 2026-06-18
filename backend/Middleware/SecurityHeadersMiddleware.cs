namespace TrainerPortal.Api.Middleware;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
        context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
        context.Response.Headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
        context.Response.Headers.TryAdd("X-XSS-Protection", "0");
        context.Response.Headers.TryAdd("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        context.Response.Headers.TryAdd(
            "Content-Security-Policy",
            "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' http://localhost:5173 http://localhost:5174 http://localhost:5175 http://localhost:5114 https://generativelanguage.googleapis.com; style-src 'self' 'unsafe-inline'; script-src 'self'");
        context.Response.Headers.Remove("Server");

        await next(context);
    }
}
