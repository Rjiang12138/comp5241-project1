import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
await prisma.cohort.update({ where: { code: "COMP5241 L02" }, data: { instructorId: "u-chan" } });
for (const r of await prisma.cohort.findMany({ orderBy: { code: "asc" }, include: { instructor: true } })) {
  console.log(`${r.code} | instructor=${r.instructor.name}`);
}
await prisma.$disconnect();
