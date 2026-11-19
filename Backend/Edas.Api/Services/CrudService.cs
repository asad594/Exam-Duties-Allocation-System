using System.Linq.Expressions;
using Edas.Api.Data;
using Edas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Edas.Api.Services;

public interface ICrudMap<TEntity, TDto, TInput>
{
    Expression<Func<TEntity, TDto>> ToDto { get; }
    TEntity Create(TInput input);
    void Update(TEntity entity, TInput input);
}

public sealed class CrudService<TEntity, TDto, TInput>(AppDbContext db, ICrudMap<TEntity, TDto, TInput> map)
    where TEntity : class, IEntity
{
    private DbSet<TEntity> Set => db.Set<TEntity>();

    public Task<List<TDto>> List(Expression<Func<TEntity, bool>>? filter) =>
        (filter is null ? Set : Set.Where(filter)).AsNoTracking().OrderBy(e => e.Id).Select(map.ToDto).ToListAsync();

    public async Task<TDto> Get(int id) =>
        await Set.AsNoTracking().Where(e => e.Id == id).Select(map.ToDto).SingleOrDefaultAsync() ?? throw Missing(id);

    public async Task<TDto> Create(TInput input)
    {
        var entity = map.Create(input);
        Set.Add(entity);
        await db.SaveChangesAsync();
        return await Get(entity.Id);
    }

    public async Task<TDto> Update(int id, TInput input)
    {
        map.Update(await Find(id), input);
        await db.SaveChangesAsync();
        return await Get(id);
    }

    public async Task Delete(int id)
    {
        Set.Remove(await Find(id));
        await db.SaveChangesAsync();
    }

    private async Task<TEntity> Find(int id) => await Set.FindAsync(id) ?? throw Missing(id);

    private static NotFoundException Missing(int id) => new($"{typeof(TEntity).Name} {id} was not found.");
}
