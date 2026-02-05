export const PORT = 8000;

export function get_host(): string {
  const host = `http://localhost:${PORT}`;
  return host;
}
