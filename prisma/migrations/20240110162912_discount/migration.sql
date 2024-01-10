-- CreateTable
CREATE TABLE "Discount" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "exp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "disc" DOUBLE PRECISION NOT NULL,
    "authId" INTEGER NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_authId_fkey" FOREIGN KEY ("authId") REFERENCES "Auth"("uid") ON DELETE RESTRICT ON UPDATE CASCADE;
