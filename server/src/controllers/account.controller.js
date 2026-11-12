import { randomInt } from "node:crypto";
import prisma from "../config/database.js";

const accountSelect = {
  id: true,
  accountNo: true,
  balance: true,
  status: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
};

function serializeAccount(account) {
  return {
    ...account,
    balance: account.balance.toFixed(2),
  };
}

export const createAccount = async (req, res) => {
  try {
    const account = await prisma.account.create({
      data: {
        accountNo: randomInt(100000000000, 999999999999).toString(),
        balance: "0.00",
        status: "PENDING",
        userId: req.user.id,
      },
      select: accountSelect,
    });

    return res.status(201).json({
      success: true,
      account: serializeAccount(account),
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Could not create account; please try again",
      });
    }

    console.error(
      "Account creation error:",
      error instanceof Error ? error.name : "Unknown error"
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const listAccounts = async (req, res) => {
  try {
    const where = req.user.role === "ADMIN" ? {} : { userId: req.user.id };
    const accounts = await prisma.account.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: accountSelect,
    });

    return res.status(200).json({
      success: true,
      accounts: accounts.map(serializeAccount),
    });
  } catch (error) {
    console.error(
      "Account listing error:",
      error instanceof Error ? error.name : "Unknown error"
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const activateAccount = async (req, res) => {
  try {
    const updated = await prisma.account.updateMany({
      where: {
        id: req.params.id,
        status: "PENDING",
      },
      data: { status: "ACTIVE" },
    });

    if (updated.count === 0) {
      const existing = await prisma.account.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: "Account not found",
        });
      }

      return res.status(409).json({
        success: false,
        message: "Only pending accounts can be activated",
      });
    }

    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
      select: accountSelect,
    });

    return res.status(200).json({
      success: true,
      account: serializeAccount(account),
    });
  } catch (error) {
    console.error(
      "Account activation error:",
      error instanceof Error ? error.name : "Unknown error"
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
