using System.Linq.Expressions;
using Edas.Api.Dtos;
using Edas.Api.Models;
using Edas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Edas.Api.Controllers;

[Route("api/staff")]
public sealed class StaffController(CrudService<Staff, StaffDto, StaffInput> s) : CrudController<Staff, StaffDto, StaffInput>(s);

[Route("api/rooms")]
public sealed class RoomsController(CrudService<Room, RoomDto, RoomInput> s) : CrudController<Room, RoomDto, RoomInput>(s);

[Route("api/courses")]
public sealed class CoursesController(CrudService<Course, CourseDto, CourseInput> s) : CrudController<Course, CourseDto, CourseInput>(s);

[Route("api/sessions")]
public sealed class SessionsController(CrudService<ExamSession, SessionDto, SessionInput> s)
    : CrudController<ExamSession, SessionDto, SessionInput>(s);

[Route("api/slots")]
public sealed class SlotsController(CrudService<Slot, SlotDto, SlotInput> s) : CrudController<Slot, SlotDto, SlotInput>(s)
{
    protected override Expression<Func<Slot, bool>>? Filter() =>
        int.TryParse(Request.Query["sessionId"], out var id) ? x => x.ExamSessionId == id : null;
}

[Route("api/unavailabilities")]
public sealed class UnavailabilitiesController(CrudService<Unavailability, UnavailabilityDto, UnavailabilityInput> s)
    : CrudController<Unavailability, UnavailabilityDto, UnavailabilityInput>(s)
{
    protected override Expression<Func<Unavailability, bool>>? Filter() =>
        int.TryParse(Request.Query["staffId"], out var id) ? x => x.StaffId == id : null;
}
