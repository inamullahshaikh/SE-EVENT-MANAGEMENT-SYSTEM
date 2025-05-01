// Mock nodemailer BEFORE requiring the app
jest.mock("nodemailer");
const nodemailer = require("nodemailer");

const sendMailMock = jest.fn().mockResolvedValue("Email sent");
nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

const request = require("supertest");
const app = require("../app");

describe("Notification Service API", () => {
  beforeEach(() => {
    sendMailMock.mockClear();
  });

  it("should send an email successfully", async () => {
    const response = await request(app).post("/send").send({
      useremail: "user@example.com",
      subject: "Test Subject",
      message: "<p>This is a test email</p>",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Email sent successfully");
    expect(sendMailMock).toHaveBeenCalledTimes(1);
    expect(sendMailMock).toHaveBeenCalledWith({
      from: "inamullahshaikh01@gmail.com",
      to: "user@example.com",
      subject: "Test Subject",
      html: "<p>This is a test email</p>",
    });
  });

  it("should handle error when sending fails", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("SMTP Error"));

    const response = await request(app).post("/send").send({
      useremail: "user@example.com",
      subject: "Failure Test",
      message: "<p>Should fail</p>",
    });

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe("SMTP Error");
  });

  it("should return 500 if request body is empty", async () => {
    sendMailMock.mockRejectedValueOnce(new Error("Invalid input"));

    const response = await request(app).post("/send").send({});

    expect(response.statusCode).toBe(500);
    expect(response.body.error).toBe("Invalid input");
  });
});
