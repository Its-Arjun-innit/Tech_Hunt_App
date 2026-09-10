/**
 * Which sidebar item should look active for a given pathname.
 *
 * "/admin" is the overview and must match exactly, otherwise it would light up
 * on every page. Every other item also owns its nested routes, so the
 * checkpoint editor at /admin/checkpoints/<id> keeps Checkpoints highlighted.
 */
export function isActiveNav(pathname: string, href: string): boolean {
  const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  const path = clean(pathname);
  const target = clean(href);

  if (target === "/admin") return path === "/admin";
  return path === target || path.startsWith(`${target}/`);
}
