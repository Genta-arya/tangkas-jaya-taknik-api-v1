/*
  Warnings:

  - Added the required column `discountPercentage` to the `DiscountProduct` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expirationDate` to the `DiscountProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `DiscountProduct` ADD COLUMN `discountPercentage` DOUBLE NOT NULL,
    ADD COLUMN `expirationDate` DATETIME(3) NOT NULL;
