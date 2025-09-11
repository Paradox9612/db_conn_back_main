const Expense = require("../models/Expense");
const Journey = require("../models/Journey");
const cloudinary = require("cloudinary").v2;
const upload = require("../utils/Upload");
const { expectedFromDistance } = require("../utils/allowance");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ================== CREATE ==================
const uploadExpenseReceipt = async (req, res) => {
  try {
    upload.single("receipt")(req, res, async function (err) {
      if (err) return res.status(500).json({ message: err.message });

      const { journeyId, type, description, amount, date } = req.body;

      if (!journeyId) return res.status(400).json({ message: "journeyId required" });

      const journey = await Journey.findById(journeyId);
      if (!journey) return res.status(404).json({ message: "Journey not found" });
      if (!journey.user.equals(req.user._id)) return res.status(403).json({ message: "Not allowed" });

      // Calculate expected amount from journey distance if not set
      if (!journey.expectedAmount) {
        journey.expectedAmount = expectedFromDistance(journey.distance);
      }

      let receiptUrl = null;
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "receipts",
        });
        receiptUrl = result.secure_url;
      }

      const newExpense = new Expense({
        journey: journeyId,
        user: req.user._id,
        type,
        description,
        amount: Number(amount) || 0,
        date: date ? new Date(date) : new Date(),
        receiptUrl,
      });

      await newExpense.save();

      journey.expenses.push(newExpense._id);
      journey.totalCost = (journey.totalCost || 0) + newExpense.amount;

      // Update variance (totalCost vs expectedAmount)
      journey.variance = journey.totalCost - journey.expectedAmount;

      await journey.save();

      res.status(201).json(newExpense);
    });
  } catch (err) {
    console.error("Upload expense error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ================== READ ==================
const getExpense = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id }).populate("journey");
    res.json(expenses);
  } catch (err) {
    console.error("Get expense error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ================== UPDATE ==================
const updateExpense = async (req, res) => {
  try {
    upload.single("receipt")(req, res, async function (err) {
      if (err) return res.status(500).json({ message: err.message });

      const { id } = req.params;
      const { type, description, amount, date } = req.body;

      const expense = await Expense.findById(id).populate("journey");
      if (!expense) return res.status(404).json({ message: "Expense not found" });
      if (!expense.user.equals(req.user._id)) return res.status(403).json({ message: "Not allowed" });

      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "receipts",
        });
        expense.receiptUrl = result.secure_url;
      }

      if (amount && Number(amount) !== expense.amount) {
        expense.journey.totalCost = (expense.journey.totalCost || 0) - expense.amount + Number(amount);
        expense.amount = Number(amount);
        // Update variance after amount change
        expense.journey.variance = expense.journey.totalCost - (expense.journey.expectedAmount || 0);
        await expense.journey.save();
      }

      if (type) expense.type = type;
      if (description) expense.description = description;
      if (date) expense.date = new Date(date);

      await expense.save();

      res.json(expense);
    });
  } catch (err) {
    console.error("Update expense error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ================== DELETE ==================
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;

    const expense = await Expense.findById(id).populate("journey");
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    if (!expense.user.equals(req.user._id)) return res.status(403).json({ message: "Not allowed" });

    expense.journey.totalCost = (expense.journey.totalCost || 0) - expense.amount;
    expense.journey.expenses = expense.journey.expenses.filter(
      (expId) => !expId.equals(expense._id)
    );
    // Update variance after deletion
    expense.journey.variance = expense.journey.totalCost - (expense.journey.expectedAmount || 0);
    await expense.journey.save();

    await expense.deleteOne();

    res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Delete expense error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  uploadExpenseReceipt,
  getExpense,
  updateExpense,
  deleteExpense,
};
