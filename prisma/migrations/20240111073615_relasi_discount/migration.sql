/*
  Warnings:

  - You are about to drop the `_CategoryToDiscount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_CategoryToDiscount" DROP CONSTRAINT "_CategoryToDiscount_A_fkey";

-- DropForeignKey
ALTER TABLE "_CategoryToDiscount" DROP CONSTRAINT "_CategoryToDiscount_B_fkey";

-- DropTable
DROP TABLE "_CategoryToDiscount";

-- CreateTable
CREATE TABLE "CategoryOnDiscount" (
    "discountId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "CategoryOnDiscount_pkey" PRIMARY KEY ("discountId","categoryId")
);

-- AddForeignKey
ALTER TABLE "CategoryOnDiscount" ADD CONSTRAINT "CategoryOnDiscount_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES "Discount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryOnDiscount" ADD CONSTRAINT "CategoryOnDiscount_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
