using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Edas.Api.Hubs;

public sealed record DutiesRevised(int VersionNo, int SlotId, string Message);

[Authorize]
public sealed class NotificationHub : Hub
{
    public static string Group(int staffId) => $"staff-{staffId}";

    public override async Task OnConnectedAsync()
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, Group(int.Parse(Context.UserIdentifier!)));
        await base.OnConnectedAsync();
    }
}
