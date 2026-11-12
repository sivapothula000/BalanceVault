import prisma from "../config/database.js";

export const listLedgerEntries = async (req, res) => {
  try {
    const where =
      req.user.role === "ADMIN"
        ? {}
        : { account: { is: { userId: req.user.id } } };

    const entries = await prisma.ledgerEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        amount: true,
        createdAt: true,
        accountId: true,
        transferId: true,
        account: {
          select: {
            id: true,
            accountNo: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      entries,
    });
  } catch (error) {
    console.error(
      "Ledger lookup error:",
      error instanceof Error ? error.name : "Unknown error"
    );
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
