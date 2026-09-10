import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminNotFound() {
  return (
    <div className="max-w-lg">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <SearchX className="size-5 shrink-0 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <h1 className="font-semibold">Not found</h1>
              <p className="text-sm text-muted-foreground">
                This item does not exist, or it belongs to a different game. It may have
                been deleted since the link was created.
              </p>
            </div>
          </div>
          <Button render={<Link href="/admin" />}>Back to overview</Button>
        </CardContent>
      </Card>
    </div>
  );
}
