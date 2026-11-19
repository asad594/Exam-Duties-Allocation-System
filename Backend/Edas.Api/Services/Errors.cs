namespace Edas.Api.Services;

public sealed class NotFoundException(string message) : Exception(message);

public sealed class RuleException(string reason) : Exception(reason);
