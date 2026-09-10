/**
 * Seeds a demo game so the app is playable immediately after setup.
 * Safe to re-run: it wipes and recreates the demo game only.
 */
import { PrismaClient, AdminRole, ChallengeType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateQrToken, generateTeamCode, generatePin } from "../lib/qr/token";

const prisma = new PrismaClient();

const GAME_NAME = "Campus Treasure Hunt — Demo";

// A compact campus cluster; roughly 100-400m apart.
const CHECKPOINTS = [
  { name: "Main Gate", lat: 28.5449, lng: 77.1926, points: 50, difficulty: 1, group: "north", capacity: 3,
    clues: ["Where every journey on campus begins.", "The first thing you pass each morning.", "The main entrance gate to campus."] },
  { name: "Central Library", lat: 28.5462, lng: 77.1941, points: 60, difficulty: 2, group: "north", capacity: 2,
    clues: ["Silence is the loudest rule here.", "Thousands of stories, none of them spoken.", "The central library building."] },
  { name: "Canteen Courtyard", lat: 28.5471, lng: 77.1918, points: 50, difficulty: 1, group: "north", capacity: 3,
    clues: ["Where students gather when the day is getting started.", "Follow the smell of chai and samosas.", "The main canteen courtyard."] },
  { name: "Science Block", lat: 28.5438, lng: 77.1953, points: 70, difficulty: 3, group: "east", capacity: 2,
    clues: ["Beakers, burners and the smell of experiments.", "Where the periodic table lives on every wall.", "The Science block main entrance." ] },
  { name: "Sports Ground", lat: 28.5425, lng: 77.1902, points: 60, difficulty: 2, group: "south", capacity: 4,
    clues: ["Where the grass remembers every match.", "Goalposts stand at both ends.", "The main sports ground." ] },
  { name: "Auditorium Steps", lat: 28.5457, lng: 77.1889, points: 70, difficulty: 3, group: "south", capacity: 2,
    clues: ["A thousand seats face one stage.", "Where convocation photographs are taken.", "The steps of the main auditorium." ] },
  { name: "Admin Block", lat: 28.5482, lng: 77.1935, points: 80, difficulty: 4, group: "east", capacity: 2,
    clues: ["Every signature you ever needed came from here.", "Fees, forms and long queues.", "The administrative block reception." ] },
  { name: "Old Banyan Tree", lat: 28.5444, lng: 77.1971, points: 90, difficulty: 5, group: "east", capacity: 2,
    clues: ["Older than every building around it.", "Its roots hang down like a curtain.", "The old banyan tree near the east lawn." ] },
];

// Controlled routing possibilities: each checkpoint offers several next hops.
const ROUTES: Record<string, string[]> = {
  "Main Gate": ["Central Library", "Canteen Courtyard", "Sports Ground", "Science Block"],
  "Central Library": ["Science Block", "Admin Block", "Old Banyan Tree", "Canteen Courtyard"],
  "Canteen Courtyard": ["Central Library", "Admin Block", "Auditorium Steps", "Sports Ground"],
  "Science Block": ["Old Banyan Tree", "Admin Block", "Central Library", "Sports Ground"],
  "Sports Ground": ["Auditorium Steps", "Main Gate", "Canteen Courtyard", "Science Block"],
  "Auditorium Steps": ["Canteen Courtyard", "Admin Block", "Sports Ground", "Central Library"],
  "Admin Block": ["Old Banyan Tree", "Central Library", "Canteen Courtyard", "Auditorium Steps"],
  "Old Banyan Tree": ["Science Block", "Central Library", "Admin Block", "Main Gate"],
};

const TEAMS = [
  { name: "Team Alpha", members: ["Aarav", "Diya"] },
  { name: "Team Beta", members: ["Rohan", "Ishita"] },
  { name: "Team Gamma", members: ["Kabir", "Meera"] },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@campus.edu";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin1234";

  // ── Admin + volunteer accounts ──────────────────────────────────
  const superAdmin = await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { role: AdminRole.SUPER_ADMIN, active: true },
    create: {
      email: adminEmail,
      name: "Super Admin",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: AdminRole.SUPER_ADMIN,
    },
  });

  await prisma.adminUser.upsert({
    where: { email: "volunteer@campus.edu" },
    update: { active: true },
    create: {
      email: "volunteer@campus.edu",
      name: "Volunteer One",
      passwordHash: await bcrypt.hash("volunteer1234", 10),
      role: AdminRole.VOLUNTEER,
    },
  });

  // ── Fresh demo game ─────────────────────────────────────────────
  await prisma.game.deleteMany({ where: { name: GAME_NAME } });
  const game = await prisma.game.create({
    data: { name: GAME_NAME, status: "ACTIVE", startsAt: new Date() },
  });

  const checkpointIds = new Map<string, string>();
  for (const cp of CHECKPOINTS) {
    const created = await prisma.checkpoint.create({
      data: {
        gameId: game.id,
        name: cp.name,
        description: `Checkpoint at ${cp.name}.`,
        qrToken: generateQrToken(),
        latitude: cp.lat,
        longitude: cp.lng,
        points: cp.points,
        capacity: cp.capacity,
        difficulty: cp.difficulty,
        routeGroup: cp.group,
        clues: {
          create: cp.clues.map((text, i) => ({ level: i + 1, text })),
        },
      },
    });
    checkpointIds.set(cp.name, created.id);
  }

  for (const [from, targets] of Object.entries(ROUTES)) {
    for (const to of targets) {
      await prisma.checkpointRoute.create({
        data: { fromId: checkpointIds.get(from)!, toId: checkpointIds.get(to)! },
      });
    }
  }

  // ── One challenge of each type, spread across checkpoints ────────
  const challenges: {
    checkpoint: string;
    type: ChallengeType;
    title: string;
    prompt: string;
    config: unknown;
  }[] = [
    {
      checkpoint: "Central Library",
      type: ChallengeType.QUIZ,
      title: "Library Quiz",
      prompt: "Answer both questions about the library.",
      config: {
        questions: [
          { question: "What is the Dewey Decimal class for Science?", options: ["300", "400", "500", "600"], answerIndex: 2 },
          { question: "What does ISBN stand for?", options: ["International Standard Book Number", "Indexed Book Name", "Internal Sorted Book Number", "International Sorted Book Naming"], answerIndex: 0 },
        ],
      },
    },
    {
      checkpoint: "Science Block",
      type: ChallengeType.RIDDLE,
      title: "Element Riddle",
      prompt: "I am the lightest of them all, first in the table, found in every star. What am I?",
      config: { answers: ["hydrogen", "h"] },
    },
    {
      checkpoint: "Old Banyan Tree",
      type: ChallengeType.PUZZLE,
      title: "Anagram Puzzle",
      prompt: "Unscramble: NAYNAB",
      config: { answers: ["banyan"] },
    },
    {
      checkpoint: "Sports Ground",
      type: ChallengeType.PHYSICAL,
      title: "Relay Sprint",
      prompt: "Complete one lap as a team. A volunteer will verify you.",
      config: {},
    },
    {
      checkpoint: "Auditorium Steps",
      type: ChallengeType.PHOTO,
      title: "Team Photo",
      prompt: "Take a photo of your whole team on the auditorium steps.",
      config: {},
    },
    {
      checkpoint: "Admin Block",
      type: ChallengeType.MULTI_STAGE,
      title: "Paper Trail",
      prompt: "Three stages, one after another.",
      config: {
        stages: [
          { prompt: "How many floors does the admin block have?", answers: ["3", "three"] },
          { prompt: "What colour is the reception desk?", answers: ["brown", "wooden"] },
          { prompt: "Name the office that issues transcripts.", answers: ["registrar", "registrar office"] },
        ],
      },
    },
  ];

  for (const c of challenges) {
    await prisma.challenge.create({
      data: {
        checkpointId: checkpointIds.get(c.checkpoint)!,
        type: c.type,
        title: c.title,
        prompt: c.prompt,
        points: 40,
        maxAttempts: 3,
        penaltyPoints: 5,
        config: c.config as never,
      },
    });
  }

  // ── Teams, players and their credentials ────────────────────────
  const credentials: string[][] = [];
  for (const t of TEAMS) {
    const team = await prisma.team.create({
      data: { gameId: game.id, name: t.name, code: generateTeamCode() },
    });
    for (let i = 0; i < t.members.length; i++) {
      const memberCode = `${t.name.split(" ")[1][0]}${String(i + 1).padStart(3, "0")}`;
      const pin = generatePin();
      await prisma.player.create({
        data: {
          teamId: team.id,
          name: t.members[i],
          memberCode,
          pinHash: await bcrypt.hash(pin, 10),
        },
      });
      credentials.push([t.name, t.members[i], memberCode, pin]);
    }
  }

  await prisma.announcement.create({
    data: { gameId: game.id, message: "Welcome! The hunt is live. Good luck." },
  });

  await prisma.auditLog.create({
    data: {
      gameId: game.id,
      actorType: "SYSTEM",
      actorId: superAdmin.id,
      actorName: "seed",
      action: "GAME_SEEDED",
      entity: "Game",
      entityId: game.id,
    },
  });

  const tokens = await prisma.checkpoint.findMany({
    where: { gameId: game.id },
    select: { name: true, qrToken: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n─────────── Demo game seeded ───────────");
  console.log(`Game: ${game.name} (${game.status})`);
  console.log(`\nAdmin login   → ${adminEmail} / ${adminPassword}`);
  console.log("Volunteer     → volunteer@campus.edu / volunteer1234");
  console.log("\nPlayer logins (team | name | member code | PIN):");
  for (const row of credentials) console.log("  " + row.join(" | "));
  console.log("\nCheckpoint scan URLs:");
  for (const t of tokens) console.log(`  ${t.name.padEnd(20)} /scan/${t.qrToken}`);
  console.log("────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
