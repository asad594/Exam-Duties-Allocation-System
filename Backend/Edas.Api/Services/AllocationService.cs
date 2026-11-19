using System.Diagnostics;
using Edas.Api.Data;
using Edas.Api.Dtos;
using Edas.Api.Models;
using Microsoft.EntityFrameworkCore;
using static Edas.Api.Services.EligibilityService;

namespace Edas.Api.Services;

public sealed record SlotInfo(int Id, TimeBlock Time, int Required);

public sealed record AssignmentInfo(int SlotId, int StaffId);

public sealed record VacancyInfo(int SlotId, int Missing, int Unavailable, int Busy, int AtLimit);

public sealed record AllocationResult(List<AssignmentInfo> Assignments, List<VacancyInfo> Vacancies);

public sealed class AllocationService(AppDbContext db, RosterService rosters)
{
    public async Task<GenerateResult> Generate(int actorId)
    {
        var clock = Stopwatch.StartNew();
        var result = Allocate(await LoadStaff(), await LoadSlots(), await LoadUnavailabilities());
        var draftId = await rosters.SaveDraft(actorId, result);
        return new GenerateResult(draftId, result.Assignments.Count, result.Vacancies.Count, clock.ElapsedMilliseconds);
    }

    public static AllocationResult Allocate(IReadOnlyList<StaffInfo> staff, IReadOnlyList<SlotInfo> slots, ILookup<int, TimeBlock> unavailable)
    {
        var duties = staff.ToDictionary(s => s.Id, _ => new List<TimeBlock>());
        var result = new AllocationResult([], []);
        foreach (var slot in OrderByScarcity(staff, slots, unavailable))
            Fill(slot, staff, duties, unavailable, result);
        return result;
    }

    // Hardest slots first: fewest staff eligible when nobody has a duty yet.
    private static IEnumerable<SlotInfo> OrderByScarcity(IReadOnlyList<StaffInfo> staff, IReadOnlyList<SlotInfo> slots, ILookup<int, TimeBlock> unavailable) =>
        slots.OrderBy(slot => staff.Count(s => Check(s, slot.Time, [], unavailable[s.Id]) == Block.None))
            .ThenBy(s => s.Time.Date).ThenBy(s => s.Time.Start).ThenBy(s => s.Id);

    private static void Fill(SlotInfo slot, IReadOnlyList<StaffInfo> staff, Dictionary<int, List<TimeBlock>> duties,
        ILookup<int, TimeBlock> unavailable, AllocationResult result)
    {
        var blocks = staff.Select(s => (Staff: s, Block: Check(s, slot.Time, duties[s.Id], unavailable[s.Id]))).ToList();
        var picked = blocks.Where(b => b.Block == Block.None).Select(b => b.Staff)
            .OrderBy(s => duties[s.Id].Sum(d => d.Hours)).ThenBy(s => duties[s.Id].Count).ThenBy(s => s.Id)
            .Take(slot.Required).ToList();
        foreach (var s in picked)
        {
            duties[s.Id].Add(slot.Time);
            result.Assignments.Add(new AssignmentInfo(slot.Id, s.Id));
        }
        if (picked.Count < slot.Required)
            result.Vacancies.Add(new VacancyInfo(slot.Id, slot.Required - picked.Count,
                Count(blocks, Block.Unavailable), Count(blocks, Block.Overlap), Count(blocks, Block.AtLimit)));
    }

    private static int Count(List<(StaffInfo Staff, Block Block)> blocks, Block block) => blocks.Count(b => b.Block == block);

    private Task<List<StaffInfo>> LoadStaff() =>
        db.Staff.AsNoTracking().Where(s => s.Role == Role.Staff).Select(s => new StaffInfo(s.Id, s.MaxDuties)).ToListAsync();

    private Task<List<SlotInfo>> LoadSlots() =>
        db.Slots.AsNoTracking()
            .Select(s => new SlotInfo(s.Id, new TimeBlock(s.ExamSession.Date, s.ExamSession.StartTime, s.ExamSession.EndTime), s.Required))
            .ToListAsync();

    private async Task<ILookup<int, TimeBlock>> LoadUnavailabilities() =>
        (await db.Unavailabilities.AsNoTracking()
            .Select(u => new { u.StaffId, Time = new TimeBlock(u.Date, u.StartTime, u.EndTime) }).ToListAsync())
        .ToLookup(u => u.StaffId, u => u.Time);
}
