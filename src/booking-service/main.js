const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Booking Schema
const bookingSchema = new mongoose.Schema({
  username: String,
  eventId: String, // MongoDB ObjectId stored as a string
  ticketsPurchased: Number,
  totalPayment: Number,
});

const Booking = mongoose.model("Booking", bookingSchema);

// Create Booking API
app.post("/create", async (req, res) => {
  try {
    const { username, eventId, ticketsPurchased, totalPayment } = req.body;

    // Fetch event details
    const eventResponse = await axios.get(
      `http://localhost:3003/get/${eventId}`
    );
    const event = eventResponse.data;
    console.log(totalPayment);
    if (!event) return res.status(404).send({ message: "Event not found" });
    if (event.numberOfTickets < ticketsPurchased)
      return res.status(400).send({ message: "Not enough tickets available" });

    // Create booking
    const booking = new Booking({
      username,
      eventId,
      ticketsPurchased,
      totalPayment,
    });
    await booking.save();

    // Update event tickets count
    await axios.put(`http://localhost:3003/update/${eventId}`, {
      numberOfTickets: event.numberOfTickets - ticketsPurchased,
    });

    // Fetch user email
    const userResponse = await axios.get(
      `http://localhost:3000/getbyusername/${username}`
    );
    const userEmail = userResponse.data?.email;

    // Send Email Confirmation
    if (userEmail) {
      await axios.post("http://localhost:3005/send", {
        useremail: userEmail,
        subject: "🎟 Booking Confirmation - Event Ticket",
        message: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #28a745;">Hello, ${userResponse.data?.name}!</h2>
            <p>Your booking for the event <b>${event.name}</b> at <b>${event.venue}</b> on <b>${event.date}</b> is confirmed.</p>
            <p><b>Tickets Purchased:</b> ${ticketsPurchased}</p>
            <p><b>Total Payment:</b> PKR ${totalPayment}</p>
            <p>Thank you for booking with us!</p>
            <p>Best regards,<br><b>EventSync Team</b></p>
          </div>
        `,
      });
    }

    res.status(200).send({
      message: "Booking created successfully. Confirmation email sent.",
      booking,
    });
  } catch (error) {
    console.error("Error in /create:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Delete Booking API
app.delete("/delete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).send({ message: "Booking not found" });

    // Fetch attendee details
    const attendeeResponse = await axios.get(
      `http://localhost:3001/getbyusername/${booking.username}`
    );
    const attendee = attendeeResponse.data;
    const userEmail = attendee?.email;
    const userName = attendee?.name || "Attendee";

    // Fetch event details to check if it still exists
    let eventExists = false;
    let updatedTickets = 0;
    try {
      const eventResponse = await axios.get(
        `http://localhost:3003/get/${booking.eventId}`
      );
      if (eventResponse.data) {
        eventExists = true;
        updatedTickets =
          eventResponse.data.numberOfTickets + booking.ticketsPurchased;
      }
    } catch (err) {
      console.error("Error fetching event details:", err.message);
      eventExists = false; 
    }

    // Restore event tickets if the event still exists
    if (eventExists) {
      await axios.put(`http://localhost:3003/update/${booking.eventId}`, {
        numberOfTickets: updatedTickets,
      });
    }

    // Delete booking
    await Booking.findByIdAndDelete(req.params.id);

    // Send Cancellation Email
    if (userEmail) {
      await axios.post("http://localhost:3005/send", {
        useremail: userEmail,
        subject: "🚫 Booking Cancelled - Event Ticket",
        message: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #dc3545;">Hello, ${userName}!</h2>
            <p>Your booking for the event has been successfully cancelled.</p>
            <p><b>Tickets Refunded:</b> ${booking.ticketsPurchased}</p>
            ${
              eventExists
                ? `<p>The tickets have been made available again for others to purchase.</p>`
                : `<p>Note: The event has been removed, so your tickets could not be restored.</p>`
            }
            <p>Your refund will be processed soon (if applicable).</p>
            <p>Best regards,<br><b>EventSync Team</b></p>
          </div>
        `,
      });
    }

    res.status(200).send({
      message: "Booking deleted successfully. Cancellation email sent.",
    });
  } catch (error) {
    console.error("Error in /delete:", error.message);
    res.status(500).send({ error: error.message });
  }
});
app.get("/get-bookings/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    console.log("Fetching bookings for eventId:", eventId);

    // Query the database using eventId as a string
    const bookings = await Booking.find({ eventId: eventId });

    if (!bookings.length) {
      return res.status(404).json({ message: "No bookings found for this event." });
    }

    res.status(200).json({ bookings });
  } catch (error) {
    console.error("Error in /get-bookings:", error.message);
    res.status(500).json({ error: error.message });
  }
});
app.get("/get-attendees-by-event/:eventId", async (req, res) => {
  try {
      const { eventId } = req.params;

      // Step 1: Fetch bookings for this event
      const bookings = await Booking.find({ eventId });

      if (!bookings.length) {
          return res.status(404).json({ message: "No attendees found for this event." });
      }

      // Step 2: Fetch attendee details for each booking
      const attendeesData = await Promise.all(
          bookings.map(async (booking) => {
              try {
                  const response = await axios.get(`http://localhost:3001/getbyusername/${booking.username}`);
console.log(response.data);
                  return {
                      bookingId: booking._id,        // Include Booking ID
                      name: response.data.name,
                      email: response.data.email,
                      phone: response.data.phone,
                      ticketsPurchased: booking.ticketsPurchased // Include Tickets Purchased
                  };
              } catch (error) {
                  console.warn(`⚠️ Attendee not found for username: ${booking.username}`);
                  return null;
              }
          })
      );

      // Remove null values
      const attendees = attendeesData.filter(attendee => attendee !== null);

      res.status(200).json({ attendees });
  } catch (error) {
      console.error("Error fetching attendees by event:", error.message);
      res.status(500).json({ error: error.message });
  }
});



// Start server
app.listen(3004, () => console.log("Booking Service running on port 3004"));
