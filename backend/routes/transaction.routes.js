const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
    createTransaction,
    getTransactions,
    getTransactionById,

} = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/",authMiddleware, createTransaction);
router.get("/",authMiddleware,getTransactions);
router.get("/:id",authMiddleware,getTransactionById);
router.put("/:id", authMiddleware, updateTransaction);


module.exports = router;