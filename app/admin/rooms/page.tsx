import { requireStaff } from "@/lib/auth/staff";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { LocateButton } from "@/components/admin/locate-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { StatusPill } from "@/components/status-badge";
import { saveRoom } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rooms" };

function RoomFields({ room }: { room?: { id: string; name: string; building: string | null; latitude: number | null; longitude: number | null; radiusM: number } }) {
  return (
    <>
      {room && <input type="hidden" name="id" value={room.id} />}
      <Input name="name" defaultValue={room?.name} placeholder="Room 204" aria-label="Room name" className="w-32" required />
      <Input name="building" defaultValue={room?.building ?? ""} placeholder="Block B" aria-label="Building" className="w-28" />
      <Input name="latitude" defaultValue={room?.latitude ?? ""} placeholder="Latitude" aria-label="Latitude" inputMode="decimal" className="w-32" />
      <Input name="longitude" defaultValue={room?.longitude ?? ""} placeholder="Longitude" aria-label="Longitude" inputMode="decimal" className="w-32" />
      <label className="flex items-center gap-1 text-sm text-muted-foreground">
        <Input name="radiusM" type="number" min={10} max={1000} defaultValue={room?.radiusM ?? 60} aria-label="Radius in metres" className="w-20" />m
      </label>
      <LocateButton />
    </>
  );
}

/**
 * Rooms carry the point and radius the location check uses. A room without
 * coordinates is fine: marks there are checked by code only.
 */
export default async function RoomsPage() {
  await requireStaff("ADMIN");
  const rooms = await prisma.room.findMany({ include: { _count: { select: { slots: true } } }, orderBy: { name: "asc" } });

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="Rooms"
        description="Stand in the room with a phone and press “Use my location”. 60 m covers most classrooms; indoor GPS drifts, so go wider rather than tighter."
      />
      <ActionForm action={saveRoom} className="flex flex-wrap items-center gap-2 rounded-lg border p-3">
        <RoomFields />
        <SubmitButton>Add room</SubmitButton>
      </ActionForm>

      <ul className="space-y-2">
        {rooms.map((r) => (
          <li key={r.id} className="rounded-lg border p-3">
            <ActionForm action={saveRoom} reset={false} className="flex flex-wrap items-center gap-2">
              <RoomFields room={r} />
              <SubmitButton variant="outline">Save</SubmitButton>
              {r.latitude == null ? <StatusPill tone="warning">No location</StatusPill> : null}
              <span className="text-xs text-muted-foreground">{r._count.slots} classes</span>
            </ActionForm>
            <div className="mt-1 flex justify-end">
              <DeleteButton kind="room" id={r.id} label={r.name} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
