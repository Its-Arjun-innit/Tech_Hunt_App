import { Trash2 } from "lucide-react";
import { deleteRow } from "@/app/admin/actions";

/**
 * Delete for reference rows. No confirm dialog on purpose: the database
 * refuses deletes that would orphan anything (a section with students, a room
 * on the timetable), so what can be deleted is cheap to re-add.
 */
export function DeleteButton({ kind, id, label }: { kind: Parameters<typeof deleteRow>[0]; id: string; label: string }) {
  return (
    <form action={deleteRow.bind(null, kind, id)}>
      <button
        type="submit"
        aria-label={`Delete ${label}`}
        title={`Delete ${label}`}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-danger focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Trash2 className="size-4" />
      </button>
    </form>
  );
}
