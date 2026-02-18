-- AlterTable
ALTER TABLE "public"."Record" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- CreateIndex
CREATE INDEX "Record_deletedAt_idx" ON "public"."Record"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."Record" ADD CONSTRAINT "Record_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
