import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { postNotice } from "@/app/teacher/actions";

/**
 * Compose a notice. Audience options are worked out by the caller from what
 * this staff member may post to; the server checks again on submit.
 */
export function NoticeComposer({ audiences }: { audiences: { value: string; label: string }[] }) {
  return (
    <ActionForm action={postNotice} className="space-y-3 rounded-2xl border bg-surface p-4">
      <div className="space-y-1.5">
        <Label htmlFor="audience">To</Label>
        <NativeSelect id="audience" name="audience" required className="h-11">
          {audiences.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Input name="title" required maxLength={120} placeholder="Title" aria-label="Title" className="h-11" />
      <Textarea name="body" required rows={4} maxLength={5000} placeholder="Write the notice…" aria-label="Notice" />
      <Input name="attachmentUrl" type="url" placeholder="Link to a file (optional)" aria-label="Attachment link" className="h-11" />
      <div className="space-y-1.5">
        <Label htmlFor="scheduledFor">Post later (optional)</Label>
        <Input id="scheduledFor" name="scheduledFor" type="datetime-local" className="h-11" />
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex min-h-11 items-center gap-2">
          <input type="checkbox" name="urgent" className="size-4 accent-[var(--danger)]" /> Urgent
        </label>
        <label className="inline-flex min-h-11 items-center gap-2">
          <input type="checkbox" name="pinned" className="size-4" /> Pin to top
        </label>
      </div>
      <SubmitButton className="h-11 w-full">Post notice</SubmitButton>
    </ActionForm>
  );
}
