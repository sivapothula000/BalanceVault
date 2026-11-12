import { z } from "zod";
import { Prisma } from "../generated/prisma/client.ts";
import prisma from "../config/database.js";

const transferSchema = z.object({
  sourceAccountId: z.string().min(1).max(64),
  destinationAccountNo: z.string().trim().min(1).max(32),
  amount: z
    .string()
    .regex(/^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/)
    .refine((amount) => /[1-9]/.test(amount), "Amount must be greater than zero"),
});

class TransferError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const createTransfer = async (req, res) => {
  const result = transferSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "A source account, destination account, and positive amount are required",
    });
  }

  const { sourceAccountId, destinationAccountNo, amount } = result.data;
  const decimalAmount = new Prisma.Decimal(amount);

  try {
    const transfer = await prisma.$transaction(
      async (tx) => {
        const sourceAccount = await tx.account.findFirst({
          where: {
            id: sourceAccountId,
            userId: req.user.id,
          },
          select: { id: true, status: true },
        });

        if (!sourceAccount) {
          throw new TransferError(404, "Source account not found");
        }

        const destinationAccount = await tx.account.findUnique({
          where: { accountNo: destinationAccountNo },
          select: { id: true, status: true },
        });

        if (!destinationAccount) {
          throw new TransferError(404, "Destination account not found");
        }

        if (sourceAccount.id === destinationAccount.id) {
          throw new TransferError(400, "Source and destination accounts must differ");
        }

        if (
          sourceAccount.status !== "ACTIVE" ||
          destinationAccount.status !== "ACTIVE"
        ) {
          throw new TransferError(409, "Both accounts must be active");
        }

        const debit = await tx.account.updateMany({
          where: {
            id: sourceAccount.id,
            userId: req.user.id,
            status: "ACTIVE",
            balance: { gte: decimalAmount },
          },
          data: {
            balance: { decrement: decimalAmount },
          },
        });

        if (debit.count !== 1) {
          throw new TransferError(409, "Insufficient funds");
        }

        const credit = await tx.account.updateMany({
          where: {
            id: destinationAccount.id,
            status: "ACTIVE",
          },
          data: {
            balance: { increment: decimalAmount },
          },
        });

        if (credit.count !== 1) {
          throw new TransferError(409, "Destination account is not active");
        }

        const pendingTransfer = await tx.transfer.create({
          data: {
            sourceAccountId: sourceAccount.id,
            destinationAccountId: destinationAccount.id,
            amount: decimalAmount,
            status: "PENDING",
          },
          select: { id: true },
        });

        await tx.ledgerEntry.createMany({
          data: [
            {
              accountId: sourceAccount.id,
              transferId: pendingTransfer.id,
              type: "DEBIT",
              amount: decimalAmount,
            },
            {
              accountId: destinationAccount.id,
              transferId: pendingTransfer.id,
              type: "CREDIT",
              amount: decimalAmount,
            },
          ],
        });

        return tx.transfer.update({
          where: { id: pendingTransfer.id },
          data: { status: "COMPLETED" },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return res.status(201).json({
      success: true,
      transfer: {
        id: transfer.id,
        amount: transfer.amount.toFixed(2),
        status: transfer.status,
        createdAt: transfer.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof TransferError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    if (error?.code === "P2034") {
      return res.status(409).json({
        success: false,
        message: "Transfer conflicted with another transaction; please retry",
      });
    }

    console.error(
      "Transfer error:",
      error instanceof Error ? error.name : "Unknown error"
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
