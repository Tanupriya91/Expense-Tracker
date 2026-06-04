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
      .collection("transaction")
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
      id: transactionRef,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
module.exports = { createTransaction };
