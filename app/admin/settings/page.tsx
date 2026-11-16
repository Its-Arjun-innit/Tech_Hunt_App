import { requireStaff } from "@/lib/auth/staff";
import { getSettings } from "@/lib/settings";
import { CAMPUS_TZ } from "@/lib/time";
import { PageHeader } from "@/components/admin/page-header";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { saveSettings } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaff("ADMIN");
  const s = await getSettings();

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader title="Settings" description={`Campus time zone: ${CAMPUS_TZ} (set CAMPUS_TZ to change).`} />
      <ActionForm action={saveSettings} reset={false} className="space-y-5">
        <Field id="minAttendancePct" label="Minimum attendance (%)" hint="Below this a student is flagged as short.">
          <Input id="minAttendancePct" name="minAttendancePct" type="number" min={1} max={100} defaultValue={s.minAttendancePct} className="w-28" />
        </Field>
        <Field id="sessionMinutes" label="Marking window (minutes)" hint="How long a class's attendance stays open after the teacher starts it.">
          <Input id="sessionMinutes" name="sessionMinutes" type="number" min={1} max={180} defaultValue={s.sessionMinutes} className="w-28" />
        </Field>
        <Field id="lateAfterMin" label="Late after (minutes)" hint="Marks after this count as late, not present.">
          <Input id="lateAfterMin" name="lateAfterMin" type="number" min={0} max={120} defaultValue={s.lateAfterMin} className="w-28" />
        </Field>
        <Field
          id="geoMode"
          label="Location check"
          hint="Phones can fake GPS and it is weak indoors, so the rotating code is the main guard. Flag keeps teachers informed without blocking honest students."
        >
          <NativeSelect id="geoMode" name="geoMode" defaultValue={s.geoMode} className="w-72">
            <option value="FLAG">Flag marks outside the room (recommended)</option>
            <option value="REJECT">Refuse marks outside the room</option>
            <option value="OFF">Don&apos;t check location</option>
          </NativeSelect>
        </Field>
        <SubmitButton>Save settings</SubmitButton>
      </ActionForm>
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
