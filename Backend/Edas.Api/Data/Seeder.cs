using Edas.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace Edas.Api.Data;

// Development-only data; runs once when the Staff table is empty.
public static class Seeder
{
    private static readonly DateOnly Day = new(2030, 3, 4);

    private static readonly (string Name, string Email, int MaxDuties)[] People =
    [
        ("Ali Raza", "ali", 4), ("Sara Ahmed", "sara", 4), ("Bilal Hussain", "bilal", 3), ("Hina Malik", "hina", 1),
        ("Usman Tariq", "usman", 4), ("Zainab Ali", "zainab", 3), ("Omar Farooq", "omar", 4), ("Fatima Noor", "fatima", 3),
        ("Hamza Iqbal", "hamza", 4), ("Ayesha Siddiqui", "ayesha", 4)
    ];

    // (course, day offset, start hour, end hour, rooms with invigilators required)
    private static readonly (string Course, int Day, int Start, int End, (string Room, int Required)[] Slots)[] Sessions =
    [
        ("CS101", 0, 9, 12, [("Room 1", 2), ("Room 2", 2)]), ("CS102", 0, 11, 13, [("Room 3", 2)]), ("CS103", 0, 14, 16, [("Room 1", 2)]),
        ("MA101", 1, 9, 12, [("Room 1", 2), ("Room 2", 2)]), ("MA102", 1, 14, 17, [("Room 1", 2)]),
        ("PH101", 2, 9, 12, [("Main Hall", 12)]),
        ("EN101", 3, 9, 11, [("Room 1", 2), ("Room 2", 1)]), ("EN102", 3, 13, 15, [("Room 3", 2)])
    ];

    public static void Run(AppDbContext db, IPasswordHasher<Staff> hasher, bool large)
    {
        if (db.Staff.Any()) return;
        db.Staff.Add(Person(hasher, "Exam Coordinator", "coord@edas.test", "Coord@123", Role.Coordinator, 0));
        if (large) SeedLarge(db, hasher); else SeedScenarios(db, hasher);
    }

    private static void SeedScenarios(AppDbContext db, IPasswordHasher<Staff> hasher)
    {
        var staff = People.Select(p => Person(hasher, p.Name, $"{p.Email}@edas.test", "Staff@123", Role.Staff, p.MaxDuties)).ToList();
        db.Staff.AddRange(staff);
        var rooms = Sessions.SelectMany(s => s.Slots).Select(s => s.Room).Distinct().ToDictionary(n => n, n => new Room { Name = n });
        foreach (var (course, day, start, end, slots) in Sessions)
        {
            var session = Session(new Course { Code = course, Title = $"{course} Examination" }, day, start, end);
            db.Slots.AddRange(slots.Select(s => new Slot { ExamSession = session, Room = rooms[s.Room], Required = s.Required }));
        }
        db.SaveChanges();
        // Usman is away all of day 2; Zainab is unavailable on the morning of the Main Hall exam.
        db.Unavailabilities.AddRange(
            new Unavailability { StaffId = staff[4].Id, Date = Day.AddDays(1), StartTime = new TimeOnly(0, 0), EndTime = new TimeOnly(23, 59, 59) },
            new Unavailability { StaffId = staff[5].Id, Date = Day.AddDays(2), StartTime = new TimeOnly(8, 0), EndTime = new TimeOnly(13, 0) });
        db.SaveChanges();
    }

    private static void SeedLarge(AppDbContext db, IPasswordHasher<Staff> hasher)
    {
        var staff = Enumerable.Range(1, 60).Select(i => Person(hasher, $"Staff {i:00}", $"staff{i:00}@edas.test", "Staff@123", Role.Staff, 4)).ToList();
        db.Staff.AddRange(staff);
        var rooms = Enumerable.Range(1, 4).Select(i => new Room { Name = $"Hall {i}" }).ToList();
        (int Start, int End)[] times = [(9, 12), (13, 15), (16, 18)];
        for (var day = 0; day < 10; day++)
            foreach (var (start, end) in times)
            {
                var session = Session(new Course { Code = $"L{day}{start:00}", Title = "Large dataset exam" }, day, start, end);
                db.Slots.AddRange(rooms.Select(r => new Slot { ExamSession = session, Room = r, Required = 2 }));
            }
        db.SaveChanges();
        db.Unavailabilities.AddRange(staff.Select((s, i) =>
            new Unavailability { StaffId = s.Id, Date = Day.AddDays(i % 10), StartTime = new TimeOnly(9, 0), EndTime = new TimeOnly(12, 0) }));
        db.SaveChanges();
    }

    private static ExamSession Session(Course course, int day, int start, int end) =>
        new() { Course = course, Date = Day.AddDays(day), StartTime = new TimeOnly(start, 0), EndTime = new TimeOnly(end, 0) };

    private static Staff Person(IPasswordHasher<Staff> hasher, string name, string email, string password, Role role, int maxDuties)
    {
        var staff = new Staff { Name = name, Email = email, Role = role, MaxDuties = maxDuties };
        staff.PasswordHash = hasher.HashPassword(staff, password);
        return staff;
    }
}
