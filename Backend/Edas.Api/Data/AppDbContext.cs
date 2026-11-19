using Edas.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Edas.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Staff> Staff => Set<Staff>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Unavailability> Unavailabilities => Set<Unavailability>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<ExamSession> ExamSessions => Set<ExamSession>();
    public DbSet<Slot> Slots => Set<Slot>();
    public DbSet<RosterVersion> RosterVersions => Set<RosterVersion>();
    public DbSet<Assignment> Assignments => Set<Assignment>();
    public DbSet<Vacancy> Vacancies => Set<Vacancy>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void ConfigureConventions(ModelConfigurationBuilder b)
    {
        b.Properties<DateTime>().HaveConversion<UtcConverter>();
        b.Properties<DateTime?>().HaveConversion<UtcConverter>();
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Staff>(ConfigureStaff);
        b.Entity<RefreshToken>(ConfigureRefreshToken);
        b.Entity<Unavailability>(ConfigureUnavailability);
        b.Entity<Course>(e => { e.Property(x => x.Code).HasMaxLength(20); e.Property(x => x.Title).HasMaxLength(200); e.HasIndex(x => x.Code).IsUnique(); });
        b.Entity<Room>(e => { e.Property(x => x.Name).HasMaxLength(100); e.HasIndex(x => x.Name).IsUnique(); });
        b.Entity<ExamSession>(ConfigureExamSession);
        b.Entity<Slot>(ConfigureSlot);
        b.Entity<RosterVersion>(ConfigureRosterVersion);
        b.Entity<Assignment>(ConfigureAssignment);
        b.Entity<Vacancy>(ConfigureVacancy);
        b.Entity<AuditLog>(ConfigureAuditLog);
        RestrictDeletesExceptOwnedRows(b);
    }

    private static void ConfigureStaff(EntityTypeBuilder<Staff> e)
    {
        e.Property(x => x.Name).HasMaxLength(100);
        e.Property(x => x.Email).HasMaxLength(200);
        e.Property(x => x.PasswordHash).HasMaxLength(200);
        e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
        e.HasIndex(x => x.Email).IsUnique();
        e.ToTable(t =>
        {
            t.HasCheckConstraint("CK_Staff_Role", "`Role` IN ('Coordinator','Staff')");
            t.HasCheckConstraint("CK_Staff_MaxDuties", "`MaxDuties` >= 0");
        });
    }

    private static void ConfigureRefreshToken(EntityTypeBuilder<RefreshToken> e)
    {
        e.Property(x => x.TokenHash).HasMaxLength(64);
        e.HasIndex(x => x.TokenHash).IsUnique();
        e.HasIndex(x => x.StaffId);
    }

    private static void ConfigureUnavailability(EntityTypeBuilder<Unavailability> e)
    {
        e.HasOne<Staff>().WithMany().HasForeignKey(x => x.StaffId);
        e.HasIndex(x => new { x.StaffId, x.Date, x.StartTime }).IsUnique();
        e.ToTable(t => t.HasCheckConstraint("CK_Unavailabilities_Time", "`StartTime` < `EndTime`"));
    }

    private static void ConfigureExamSession(EntityTypeBuilder<ExamSession> e)
    {
        e.HasIndex(x => new { x.Date, x.StartTime });
        e.ToTable(t => t.HasCheckConstraint("CK_ExamSessions_Time", "`StartTime` < `EndTime`"));
    }

    private static void ConfigureSlot(EntityTypeBuilder<Slot> e)
    {
        e.HasIndex(x => new { x.ExamSessionId, x.RoomId }).IsUnique();
        e.ToTable(t => t.HasCheckConstraint("CK_Slots_Required", "`Required` > 0"));
    }

    private static void ConfigureRosterVersion(EntityTypeBuilder<RosterVersion> e)
    {
        e.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
        e.HasIndex(x => x.VersionNo).IsUnique();
        e.HasOne<Staff>().WithMany().HasForeignKey(x => x.CreatedById);
        // Unique index over a column that is NULL for published rows allows at most one draft.
        e.Property<int?>("DraftKey").HasComputedColumnSql("IF(`Status` = 'Draft', 1, NULL)", stored: true);
        e.HasIndex("DraftKey").IsUnique();
        e.ToTable(t =>
        {
            t.HasCheckConstraint("CK_RosterVersions_Status", "`Status` IN ('Draft','Published')");
            t.HasCheckConstraint("CK_RosterVersions_PublishedAt", "(`Status` = 'Published') = (`PublishedAt` IS NOT NULL)");
        });
    }

    private static void ConfigureAssignment(EntityTypeBuilder<Assignment> e)
    {
        e.HasOne<RosterVersion>().WithMany().HasForeignKey(x => x.RosterVersionId);
        e.HasIndex(x => new { x.RosterVersionId, x.SlotId, x.StaffId }).IsUnique();
        e.HasIndex(x => x.StaffId);
        e.HasIndex(x => x.SlotId);
    }

    private static void ConfigureVacancy(EntityTypeBuilder<Vacancy> e)
    {
        e.HasOne<RosterVersion>().WithMany().HasForeignKey(x => x.RosterVersionId);
        e.HasIndex(x => new { x.RosterVersionId, x.SlotId }).IsUnique();
        e.ToTable(t => t.HasCheckConstraint("CK_Vacancies_Missing", "`Missing` > 0"));
    }

    private static void ConfigureAuditLog(EntityTypeBuilder<AuditLog> e)
    {
        e.Property(x => x.Action).HasConversion<string>().HasMaxLength(20);
        e.HasOne<RosterVersion>().WithMany().HasForeignKey(x => x.RosterVersionId);
        e.HasOne<Slot>().WithMany().HasForeignKey(x => x.SlotId);
        e.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorId);
        e.HasOne(x => x.OldStaff).WithMany().HasForeignKey(x => x.OldStaffId);
        e.HasOne(x => x.NewStaff).WithMany().HasForeignKey(x => x.NewStaffId);
        e.ToTable(t =>
        {
            t.HasCheckConstraint("CK_AuditLogs_Action", "`Action` IN ('Replace','Publish')");
            t.HasCheckConstraint("CK_AuditLogs_Replace",
                "`Action` <> 'Replace' OR (`SlotId` IS NOT NULL AND `OldStaffId` IS NOT NULL AND `NewStaffId` IS NOT NULL AND `OldStaffId` <> `NewStaffId`)");
        });
    }

    private static void RestrictDeletesExceptOwnedRows(ModelBuilder b)
    {
        foreach (var fk in b.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys()))
            fk.DeleteBehavior = DeleteBehavior.Restrict;
        b.Entity<Slot>().HasOne(x => x.ExamSession).WithMany().OnDelete(DeleteBehavior.Cascade);
        b.Entity<Assignment>().HasOne<RosterVersion>().WithMany().HasForeignKey(x => x.RosterVersionId).OnDelete(DeleteBehavior.Cascade);
        b.Entity<Vacancy>().HasOne<RosterVersion>().WithMany().HasForeignKey(x => x.RosterVersionId).OnDelete(DeleteBehavior.Cascade);
    }
}
