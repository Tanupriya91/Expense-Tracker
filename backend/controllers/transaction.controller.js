const { parseISO, parse, startOfMonth, endOfMonth } = require("date-fns");
const { Timestamp } = require("firebase-admin/firestore");

const { firestore } = require("firebase-admin");
const { db, admin } = require("../config/firebase");

const createTransaction = async (req, res) => {
  try {
    const { amount, type, category, date } = req.body;

    if (!amount || !type || !category || !date) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }
    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be either income or expense",
      });
    }
    const uid = req.user.uid;

    const transactionRef = await db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .add({
        amount,
        type,
        category,
        date: Timestamp.fromDate(parseISO(date)),
        userId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    res.status(201).json({
      success: true,
      id: transactionRef.id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTransactions = async (req, res) => {
  try {
    const uid = req.user.uid;

    const {
      type,
      category,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
      limit = 10,
      startAfter,
    } = req.query;

    console.log("startAfter =", startAfter);
    const pageLimit = Math.min(parseInt(limit) || 10, 50);

    let query = db.collection("users").doc(uid).collection("transactions");

    if (type) {
      query = query.where("type", "==", type);
    }
    if (category) {
      query = query.where("category", "==", category);
    }

    if (startDate) {
      query = query.where(
        "date",
        ">=",
        Timestamp.fromDate(parseISO(startDate)),
      );
    }
    if (endDate) {
      query = query.where("date", "<=", Timestamp.fromDate(parseISO(endDate)));
    }

    const validSortFields = ["amount", "date"];

    query = query.orderBy(
      validSortFields.includes(sortBy) ? sortBy : "date",
      sortOrder == "asc" ? "asc" : "desc",
    );

    console.log(req.query);

    if (startAfter) {
      const cursorDoc = await db
        .collection("users")
        .doc(uid)
        .collection("transactions")
        .doc(startAfter)
        .get();

      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    query = query.limit(pageLimit + 1);

    const snapshot = await query.get();

    let nextCursor = null;

    let docs = snapshot.docs;

    if (docs.length > pageLimit) {
      docs.pop();

      nextCursor = docs[docs.length - 1].id;
    }

    const transactions = docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json({
      success: true,
      transactions,
      nextCursor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getMonthlySummary = async (req, res) => {
  try {
    const uid = req.user.uid;

    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    const monthDate = parse(month, "yyyy-MM", new Date());

    const monthStart = startOfMonth(monthDate);

    const monthEnd = endOfMonth(monthDate);

    const startTimestamp = Timestamp.fromDate(monthStart);

    const endTimestamp = Timestamp.fromDate(monthEnd);

    const incomeQuery = db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .where("date", ">=", startTimestamp)
      .where("date", "<=", endTimestamp)
      .where("type", "==", "income");

    const incomeAggregate = await incomeQuery
      .aggregate({
        totalIncome: firestore.AggregateField.sum("amount"),
      })
      .get();
    const totalIncome = incomeAggregate.data().totalIncome || 0;

    const expenseQuery = db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .where("date", ">=", startTimestamp)
      .where("date", "<=", endTimestamp)
      .where("type", "==", "expense");

    const expenseAggregate = await expenseQuery
      .aggregate({
        totalExpenses: firestore.AggregateField.sum("amount"),
      })
      .get();

    const totalExpenses = expenseAggregate.data().totalExpenses || 0;

    const netBalance = totalIncome - totalExpenses;
    const countAggregate = await db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .where("date", ">=", startTimestamp)
      .where("date", "<=", endTimestamp)
      .count()
      .get();

    const transactionCount = countAggregate.data().count;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .where("date", ">=", startTimestamp)
      .where("date", "<=", endTimestamp)
      .get();

    return res.status(200).json({
      month,
      totalIncome,
      totalExpenses,
      netBalance,
      transactionCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getCategoryBreakdown = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required",
      });
    }

    const monthDate = parse(month, "yyyy-MM", new Date());
    const monthStart = startOfMonth(monthDate);

    const monthEnd = endOfMonth(monthDate);

    const startTimestamp = Timestamp.fromDate(monthStart);

    const endTimestamp = Timestamp.fromDate(monthEnd);

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .where("date", ">=", startTimestamp)
      .where("date", "<=", endTimestamp)
      .get();

    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    const expenseTransactions = transactions.filter(
  (transaction) => transaction.type === "expense"
);
    const grouped = expenseTransactions.reduce((acc, transaction) => {
      const category = transaction.category;

      if (!acc[category]) {
        acc[category] = {
          category,
          total: 0,
          count: 0,
        };
      }

      acc[category].total += transaction.amount;
      acc[category].count += 1;

      return acc;
    }, {});

    const breakdown = Object.values(grouped);

    const totalExpenses = transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => {
        return sum + transaction.amount;
      }, 0);

    breakdown.forEach((item) => {
      item.percentage =
        totalExpenses > 0
          ? Number(((item.total / totalExpenses) * 100).toFixed(2))
          : 0;
    });
    breakdown.sort((a, b) => b.total - a.total);

    return res.status(200).json({
      month,
      breakdown,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getTransactionById = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const doc = await db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .doc(id)
      .get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const transaction = {
      id: doc.id,
      ...doc.data(),
    };

    if (transaction.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    return res.status(200).json({
      success: true,
      transaction,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;
    const { amount, type, category, date } = req.body;

    const docRef = db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }
    const transaction = doc.data();

    if (transaction.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
    if (amount && amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }
    if (type && !["income", "expense"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid transaction type",
      });
    }
    await docRef.update({
      ...(amount !== undefined && { amount }),
      ...(type && { type }),
      ...(category && { category }),
      ...(date && { date }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return res.status(200).json({
      success: true,
      message: "Transaction updated succeesssfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const docRef = db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .doc(id);

    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    const transaction = doc.data();

    if (transaction.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: "Acess denied",
      });
    }

    await docRef.delete();

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  getMonthlySummary,
  getCategoryBreakdown,
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};
