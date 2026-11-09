-- AlterEnum
ALTER TYPE "AiPurpose" ADD VALUE 'vision';

-- AlterTable
ALTER TABLE "AiRun" ADD COLUMN     "actorId" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "outcome" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN     "provider" TEXT,
ALTER COLUMN "tokensIn" DROP NOT NULL,
ALTER COLUMN "tokensIn" DROP DEFAULT,
ALTER COLUMN "tokensOut" DROP NOT NULL,
ALTER COLUMN "tokensOut" DROP DEFAULT,
ALTER COLUMN "costUsd" DROP NOT NULL,
ALTER COLUMN "costUsd" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AiReview" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "courseVersionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiReview_courseVersionId_key" ON "AiReview"("courseVersionId");

-- CreateIndex
CREATE INDEX "AiReview_courseId_createdAt_idx" ON "AiReview"("courseId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRun_actorId_createdAt_idx" ON "AiRun"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_courseVersionId_fkey" FOREIGN KEY ("courseVersionId") REFERENCES "CourseVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
