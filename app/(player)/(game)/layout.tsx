import { requirePlayer, touchPlayer } from "@/lib/auth/player";
import { BottomNav } from "@/components/player/bottom-nav";

/**
 * Shell for the signed-in player tabs. Login and the direct-link scan route
 * sit outside this group so they render without the nav.
 *
 * Presence is touched here rather than in each page, so simply having the app
 * open keeps a member showing as online to their team.
 */
// This layout wraps several sibling routes, so it takes plain children
// rather than a single route's generated LayoutProps type.
export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const { player } = await requirePlayer();
  await touchPlayer(player.id);

  return (
    <div className="flex-1 flex flex-col pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
