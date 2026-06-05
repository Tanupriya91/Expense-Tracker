const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");

const {
    createTransaction,
    getTransactions,
    getMonthlySummary,
    getTransactionById,
    getCategoryBreakdown,
    updateTransaction,
    deleteTransaction,
    

} = require("../controllers/transaction.controller");

const router = express.Router();

router.post("/",authMiddleware, createTransaction);
router.get("/",authMiddleware,getTransactions);
router.get("/summary/monthly",authMiddleware,getMonthlySummary);
router.get("/summary/by-category",authMiddleware,getCategoryBreakdown);
router.get("/:id",authMiddleware,getTransactionById);
router.put("/:id", authMiddleware, updateTransaction);
router.delete("/:id",authMiddleware,deleteTransaction);


module.exports = router;