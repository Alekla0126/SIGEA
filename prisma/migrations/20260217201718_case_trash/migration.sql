-- AlterTable
ALTER TABLE "public"."Case" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "Case_deletedAt_idx" ON "public"."Case"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
