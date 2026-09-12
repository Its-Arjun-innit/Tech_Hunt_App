import type { AnnouncementAudience } from "@prisma/client";

export type AnnouncementLike = {
  audience: AnnouncementAudience;
  teamIds: string[];
  scheduledFor: Date | null;
};

/**
 * Whether a team should see an announcement.
 *
 * Scheduling is evaluated here rather than by a job: a future-dated
 * announcement simply stays invisible until its time passes, the same trick
 * the routing reservations use, which keeps the app free of any scheduler.
 */
export function visibleToTeam(
  announcement: AnnouncementLike,
  teamId: string,
  now: Date = new Date(),
): boolean {
  if (announcement.scheduledFor && announcement.scheduledFor > now) return false;

  switch (announcement.audience) {
    case "ALL_TEAMS":
      return true;
    case "SELECTED_TEAMS":
      return announcement.teamIds.includes(teamId);
    case "VOLUNTEERS":
    case "ADMINS":
      return false;
  }
}

/** Whether a staff member of this role should see an announcement. */
export function visibleToStaff(
  announcement: AnnouncementLike,
  role: "SUPER_ADMIN" | "GAME_ADMIN" | "VOLUNTEER",
  now: Date = new Date(),
): boolean {
  if (announcement.scheduledFor && announcement.scheduledFor > now) return false;

  if (announcement.audience === "VOLUNTEERS") return role === "VOLUNTEER";
  if (announcement.audience === "ADMINS") return role !== "VOLUNTEER";
  // Team broadcasts are not staff notices.
  return false;
}

export const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  ALL_TEAMS: "All teams",
  SELECTED_TEAMS: "Selected teams",
  VOLUNTEERS: "Volunteers",
  ADMINS: "Admins",
};
