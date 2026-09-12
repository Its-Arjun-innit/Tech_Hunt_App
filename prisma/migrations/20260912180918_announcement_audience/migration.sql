-- CreateEnum
CREATE TYPE "AnnouncementAudience" AS ENUM ('ALL_TEAMS', 'SELECTED_TEAMS', 'VOLUNTEERS', 'ADMINS');

-- AlterTable
ALTER TABLE "Announcement" ADD COLUMN     "audience" "AnnouncementAudience" NOT NULL DEFAULT 'ALL_TEAMS',
ADD COLUMN     "scheduledFor" TIMESTAMP(3);
