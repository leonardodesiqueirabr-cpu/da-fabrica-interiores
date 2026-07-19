export const ADMIN_SESSION_COOKIE = "dafabrica_admin_session";
export const ADMIN_SESSION_VALUE = "authenticated";

function getAdminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "";
}

export function isValidAdminCredentials(username: string, password: string) {
  const expectedUser = getAdminUsername();
  const expectedPass = getAdminPassword();
  if (!expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

export function isAdminSessionValue(value: string | undefined) {
  return value === ADMIN_SESSION_VALUE;
}
