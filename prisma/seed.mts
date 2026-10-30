// Seed the database with the mid-term prototype's fixture data.
//
// The fixture itself lives in lib/demo-data.ts, because the "reset demo data"
// button on /settings needs the same data. This file is only the CLI wrapper.
//
// Run with: npm run db:seed   (after `npx prisma db push`)
// Or both:  npm run db:reset

import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "../lib/demo-data.ts";

const prisma = new PrismaClient();

seedDemoData(prisma)
  .then((s) => {
    console.log(
      `seeded: ${s.users} users · ${s.cohorts} cohorts · ${s.courses} courses · ` +
        `${s.modules} modules · ${s.activities} activities · ${s.enrolments} enrolments · ${s.events} events`,
    );
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
