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
        date,
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

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("transactions")
      .orderBy("date", "desc")
      .get();

    const transactions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json({
      success: true,
      transactions,
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
  getTransactionById,
  updateTransaction,
  deleteTransaction,
};
