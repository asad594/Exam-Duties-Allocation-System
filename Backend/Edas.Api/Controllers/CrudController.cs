using System.Linq.Expressions;
using Edas.Api.Models;
using Edas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Edas.Api.Controllers;

[ApiController, Authorize(Roles = nameof(Role.Admin))]
public abstract class CrudController<TEntity, TDto, TInput>(CrudService<TEntity, TDto, TInput> service) : ControllerBase
    where TEntity : class, IEntity
{
    [HttpGet]
    public Task<List<TDto>> List() => service.List(Filter());

    [HttpGet("{id:int}")]
    public Task<TDto> Get(int id) => service.Get(id);

    [HttpPost]
    public async Task<ObjectResult> Create(TInput input) => StatusCode(StatusCodes.Status201Created, await service.Create(input));

    [HttpPut("{id:int}")]
    public Task<TDto> Update(int id, TInput input) => service.Update(id, input);

    [HttpDelete("{id:int}")]
    public async Task<NoContentResult> Delete(int id)
    {
        await service.Delete(id);
        return NoContent();
    }

    protected virtual Expression<Func<TEntity, bool>>? Filter() => null;
}
