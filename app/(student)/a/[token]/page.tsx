import { requireStudent } from "@/lib/auth/student";
import { getSettings } from "@/lib/settings";
import { MarkFlow } from "@/components/student/mark-flow";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mark attendance" };

/**
 * Where the phone's own camera app lands after scanning the class QR. Sits
 * outside the tabs so the result fills the screen. A signed-out student is
 * sent to log in and brought back here; if the code expired meanwhile they
 * type the current one.
 */
export default async function DeepLinkMark({ params, searchParams }: PageProps<"/a/[token]">) {
  const { token } = await params;
  const { c } = await searchParams;
  await requireStudent(`/a/${token}${typeof c === "string" ? `?c=${c}` : ""}`);
  const { geoMode } = await getSettings();
  const code = typeof c === "string" && /^\d{6}$/.test(c) ? c : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <MarkFlow needLocation={geoMode !== "OFF"} initial={{ token, code }} />
    </div>
  );
}
