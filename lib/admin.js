/**
 * Returns true if the given email belongs to an admin.
 * Admin emails are configured via the ADMIN_EMAILS environment variable
 * as a comma-separated list.
 */
export function isAdmin(email) {
    const list = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim());
    return !!email && list.includes(email);
}
