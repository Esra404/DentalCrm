export function getChangedFields(
  current: Record<string, unknown>,
  next: Record<string, unknown>,
): string[] {
  return Object.entries(next)
    .filter(([key, value]) => {
      const previous = current[key];
      if (previous instanceof Date && value instanceof Date) {
        return previous.getTime() !== value.getTime();
      }
      if (
        previous !== null &&
        value !== null &&
        typeof previous === "object" &&
        typeof value === "object" &&
        "toString" in previous &&
        "toString" in value
      ) {
        return String(previous) !== String(value);
      }
      return previous !== value;
    })
    .map(([key]) => key);
}
