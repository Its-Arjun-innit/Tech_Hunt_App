"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CheckpointMap, type MapPoint } from "@/components/map/checkpoint-map";
import { createCheckpoint, updateCheckpoint } from "@/app/admin/checkpoints/actions";

type CheckpointValues = {
  id?: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  points: number;
  capacity: number;
  difficulty: number;
  routeGroup: string;
  active: boolean;
};

const EMPTY: CheckpointValues = {
  name: "",
  description: "",
  latitude: 28.5449,
  longitude: 77.1926,
  points: 50,
  capacity: 2,
  difficulty: 3,
  routeGroup: "",
  active: true,
};

export function CheckpointForm({
  mapsApiKey,
  others,
  initial,
}: {
  mapsApiKey: string;
  others: MapPoint[];
  initial?: CheckpointValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const values = initial ?? EMPTY;

  // Coordinates are controlled so the map and the number inputs stay in sync.
  const [coords, setCoords] = useState({
    latitude: values.latitude,
    longitude: values.longitude,
  });

  return (
    <form
      className="space-y-5"
      action={(formData) =>
        startTransition(async () => {
          formData.set("latitude", String(coords.latitude));
          formData.set("longitude", String(coords.longitude));

          const result = initial?.id
            ? await updateCheckpoint(initial.id, formData)
            : await createCheckpoint(formData);

          toast[result.ok ? "success" : "error"](result.message);
          if (result.ok && result.id) router.push(`/admin/checkpoints/${result.id}`);
          else router.refresh();
        })
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={values.name} required placeholder="Central Library" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="routeGroup">Route group</Label>
          <Input
            id="routeGroup"
            name="routeGroup"
            defaultValue={values.routeGroup}
            placeholder="north"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={values.description}
          rows={2}
          placeholder="Notes for organizers and volunteers."
        />
      </div>

      <CheckpointMap
        apiKey={mapsApiKey}
        value={coords}
        onChange={(latitude, longitude) => setCoords({ latitude, longitude })}
        points={others.filter((o) => o.id !== initial?.id)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            name="latitude"
            type="number"
            step="any"
            value={coords.latitude}
            onChange={(e) => setCoords((c) => ({ ...c, latitude: Number(e.target.value) }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            name="longitude"
            type="number"
            step="any"
            value={coords.longitude}
            onChange={(e) => setCoords((c) => ({ ...c, longitude: Number(e.target.value) }))}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="points">Points</Label>
          <Input id="points" name="points" type="number" min={0} defaultValue={values.points} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity (teams)</Label>
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={values.capacity} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty (1–5)</Label>
          <Input
            id="difficulty"
            name="difficulty"
            type="number"
            min={1}
            max={5}
            defaultValue={values.difficulty}
          />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div>
          <Label htmlFor="active" className="font-medium">
            Active
          </Label>
          <p className="text-sm text-muted-foreground">
            Inactive checkpoints are excluded from routing and reject scans.
          </p>
        </div>
        <Switch id="active" name="active" defaultChecked={values.active} />
      </div>

      <Button type="submit" disabled={pending}>
        <Save className="size-4" />
        {pending ? "Saving…" : initial?.id ? "Save checkpoint" : "Create checkpoint"}
      </Button>
    </form>
  );
}
