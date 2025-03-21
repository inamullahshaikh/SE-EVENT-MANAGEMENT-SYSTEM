const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Payment Schema
const paymentSchema = new mongoose.Schema({
  cardNumber: String,
  cardHolderName: String,
  dateOfIssue: String, // MM/YY
  dateOfExpiry: String, // MM/YY
  cvc: String, // Hashed cvc
  cardType: String, // Visa, MasterCard, etc.
  attendee: String, // Username of the attendee
});

const Payment = mongoose.model("Payment", paymentSchema, "payments");

// Middleware to determine card type based on BIN
const getCardType = (cardNumber) => {
  const bin = cardNumber.slice(0, 6); // First 6 digits are the BIN
  if (bin.startsWith("4")) return "Visa";
  if (bin.startsWith("5") || bin.startsWith("2")) return "MasterCard";
  if (bin.startsWith("34") || bin.startsWith("37")) return "American Express";
  if (bin.startsWith("6")) return "Discover";
  return "Unknown"; // Unknown card type
};

// Create payment
app.post("/create", async (req, res) => {
  try {
    const {
      cardNumber,
      cardHolderName,
      dateOfIssue,
      dateOfExpiry,
      cvc,
      attendee,
    } = req.body;

    // Check if the user already has the same card
    const existingPayment = await Payment.findOne({ attendee, cardNumber });
    if (existingPayment) {
      return res
        .status(400)
        .send({ message: "This card is already added by the user." });
    }

    // Hash the CVC before saving it
    const hashedCvc = await bcrypt.hash(cvc, 10);

    // Determine the card type based on BIN
    const cardType = getCardType(cardNumber);

    // Create new payment record
    const payment = new Payment({
      cardNumber,
      cardHolderName,
      dateOfIssue,
      dateOfExpiry,
      cvc: hashedCvc,
      cardType,
      attendee,
    });

    await payment.save();

    res.status(200).send({ message: "Payment created successfully", payment });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Delete payment by username and card number
app.delete("/delete", async (req, res) => {
  try {
    const { username, cardNumber } = req.body;

    // Find the payment record matching both the username and card number
    const payment = await Payment.findOneAndDelete({
      attendee: username,
      cardNumber: cardNumber,
    });

    if (!payment) {
      return res.status(404).send({
        message: "Payment not found with the given username and card number",
      });
    }

    res.status(200).send({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Fetch payments by attendee (username)
app.get("/get-by-attendee/:username", async (req, res) => {
  try {
    const payments = await Payment.find({ attendee: req.params.username });
    if (!payments.length)
      return res
        .status(404)
        .send({ message: "No payments found for this attendee" });

    res.status(200).send(payments);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(3007, () => console.log("Payment service running on port 3007"));
