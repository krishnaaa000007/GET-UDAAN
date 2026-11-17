-- CreateTable
CREATE TABLE "ServiceProject" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceFile" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromTeam" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceProject_orderId_key" ON "ServiceProject"("orderId");

-- CreateIndex
CREATE INDEX "ServiceProject_userId_idx" ON "ServiceProject"("userId");

-- CreateIndex
CREATE INDEX "ServiceFile_projectId_idx" ON "ServiceFile"("projectId");

-- CreateIndex
CREATE INDEX "ServiceMessage_projectId_createdAt_idx" ON "ServiceMessage"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "ServiceFile" ADD CONSTRAINT "ServiceFile_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ServiceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceMessage" ADD CONSTRAINT "ServiceMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ServiceProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Security: same rule as every other table — Row Level Security ON with no policies,
-- so Supabase's public API keys can read/write nothing. Our server (table owner) bypasses RLS.
ALTER TABLE "ServiceProject" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ServiceMessage" ENABLE ROW LEVEL SECURITY;
