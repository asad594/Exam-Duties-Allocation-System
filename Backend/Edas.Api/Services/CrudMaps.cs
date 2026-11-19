using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using Edas.Api.Dtos;
using Edas.Api.Models;
using Microsoft.AspNetCore.Identity;

namespace Edas.Api.Services;

public sealed class StaffMap(IPasswordHasher<Staff> hasher) : ICrudMap<Staff, StaffDto, StaffInput>
{
    public Expression<Func<Staff, StaffDto>> ToDto => s => new StaffDto(s.Id, s.Name, s.Email, s.Role, s.MaxDuties);

    public Staff Create(StaffInput input)
    {
        if (input.Password is null) throw new ValidationException("Password is required.");
        var staff = new Staff();
        Update(staff, input);
        return staff;
    }

    public void Update(Staff staff, StaffInput input)
    {
        (staff.Name, staff.Email, staff.Role, staff.MaxDuties) = (input.Name, input.Email, input.Role!.Value, input.MaxDuties);
        // On update a missing password keeps the current one.
        if (input.Password is not null) staff.PasswordHash = hasher.HashPassword(staff, input.Password);
    }
}

public sealed class CourseMap : ICrudMap<Course, CourseDto, CourseInput>
{
    public Expression<Func<Course, CourseDto>> ToDto => c => new CourseDto(c.Id, c.Code, c.Title);
    public Course Create(CourseInput input) => new() { Code = input.Code, Title = input.Title };
    public void Update(Course course, CourseInput input) => (course.Code, course.Title) = (input.Code, input.Title);
}

public sealed class RoomMap : ICrudMap<Room, RoomDto, RoomInput>
{
    public Expression<Func<Room, RoomDto>> ToDto => r => new RoomDto(r.Id, r.Name);
    public Room Create(RoomInput input) => new() { Name = input.Name };
    public void Update(Room room, RoomInput input) => room.Name = input.Name;
}

public sealed class SessionMap : ICrudMap<ExamSession, SessionDto, SessionInput>
{
    public Expression<Func<ExamSession, SessionDto>> ToDto => s => new SessionDto(s.Id, s.CourseId, s.Date, s.StartTime, s.EndTime);
    public ExamSession Create(SessionInput input) => Apply(new ExamSession(), input);
    public void Update(ExamSession session, SessionInput input) => Apply(session, input);

    private static ExamSession Apply(ExamSession s, SessionInput i)
    {
        (s.CourseId, s.Date, s.StartTime, s.EndTime) = (i.CourseId, i.Date, i.StartTime, i.EndTime);
        return s;
    }
}

public sealed class SlotMap : ICrudMap<Slot, SlotDto, SlotInput>
{
    public Expression<Func<Slot, SlotDto>> ToDto => s => new SlotDto(s.Id, s.ExamSessionId, s.RoomId, s.Required);
    public Slot Create(SlotInput input) => new() { ExamSessionId = input.ExamSessionId, RoomId = input.RoomId, Required = input.Required };
    public void Update(Slot slot, SlotInput input) => (slot.ExamSessionId, slot.RoomId, slot.Required) = (input.ExamSessionId, input.RoomId, input.Required);
}

public sealed class UnavailabilityMap : ICrudMap<Unavailability, UnavailabilityDto, UnavailabilityInput>
{
    public Expression<Func<Unavailability, UnavailabilityDto>> ToDto => u => new UnavailabilityDto(u.Id, u.StaffId, u.Date, u.StartTime, u.EndTime);
    public Unavailability Create(UnavailabilityInput input) => Apply(new Unavailability(), input);
    public void Update(Unavailability unavailability, UnavailabilityInput input) => Apply(unavailability, input);

    private static Unavailability Apply(Unavailability u, UnavailabilityInput i)
    {
        (u.StaffId, u.Date, u.StartTime, u.EndTime) = (i.StaffId, i.Date, i.StartTime, i.EndTime);
        return u;
    }
}
