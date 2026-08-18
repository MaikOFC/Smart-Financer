export const ADMIN_EMAIL = "miqueias2300nik@gmail.com";
export const ADMIN_USER_ID = "1703bc04-af6d-4bfa-9d6f-422fa3b077a6";
export const ADMIN_USERNAME = "miqueias2300nik";

/**
 * Checks if the given user object corresponds to the registered administrator.
 */
export function isUserAdmin(user: { id?: string; email?: string; name?: string } | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email || "").toLowerCase().trim();
  const id = (user.id || "").toLowerCase().trim();
  const name = (user.name || "").toLowerCase().trim();

  return (
    email === ADMIN_EMAIL.toLowerCase() ||
    id === ADMIN_USER_ID.toLowerCase() ||
    id.startsWith("1703bc04") ||
    name === ADMIN_USERNAME.toLowerCase()
  );
}
