const ABSOLUTE_URL_REGEX = /^(?:[a-z]+:)?\/\//i;

export function withBasePath(relativePath) {
  // Default to the Vite base path when no input is provided.
  if (!relativePath) {
    return import.meta.env.BASE_URL ?? "/";
  }
  // Leave absolute URLs untouched.
  if (ABSOLUTE_URL_REGEX.test(relativePath)) {
    return relativePath;
  }
  const base = import.meta.env.BASE_URL ?? "/";
  const baseWithoutTrailingSlash = base.endsWith("/")
    ? base.slice(0, -1)
    : base;
  const pathWithoutLeadingSlash = relativePath.startsWith("/")
    ? relativePath.slice(1)
    : relativePath;
  const combined = `${baseWithoutTrailingSlash}/${pathWithoutLeadingSlash}`;
  // Ensure the final path always starts with a slash.
  return combined.startsWith("/") ? combined : `/${combined}`;
}
