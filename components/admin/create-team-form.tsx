"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTeam } from "@/app/admin/teams/actions";

export function CreateTeamForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="flex gap-2"
      action={(formData) =>
        startTransition(async () => {
          const result = await createTeam(formData);
          toast[result.ok ? "success" : "error"](result.message);
          if (result.ok) formRef.current?.reset();
          router.refresh();
        })
      }
    >
      <Input name="name" placeholder="Team name" required className="h-9 max-w-xs" />
      <Button type="submit" disabled={pending}>
        <Plus className="size-4" /> Add team
      </Button>
    </form>
  );
}
