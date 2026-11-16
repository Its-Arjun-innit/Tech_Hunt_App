"use client";

import { useEffect } from "react";
import { markNoticeRead } from "@/app/(student)/actions";

/** Fires once the notice is on screen. Renders nothing. */
export function MarkRead({ noticeId }: { noticeId: string }) {
  useEffect(() => {
    void markNoticeRead(noticeId);
  }, [noticeId]);
  return null;
}
