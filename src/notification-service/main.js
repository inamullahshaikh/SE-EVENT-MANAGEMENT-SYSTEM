const express = require("express");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config(); // Load environment variables from .env

const app = express();
app.use(express.json());
app.use(cors());

// Configure Nodemailer Transporter using environment variables
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL, // Load email from .env
    pass: process.env.EMAIL_PASSWORD, // Load password from .env
  },
});
// API to Send Notification
app.post("/send", async (req, res) => {
  try {
    const { useremail, subject, message } = req.body;

    const mailOptions = {
      from: "inamullahshaikh01@gmail.com",
      to: useremail,
      subject: subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: "Email sent successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.listen(3005, () =>
  console.log("Notification service running on port 3005")
);
