
import nodemailer from "nodemailer";
import dotenv from 'dotenv';

dotenv.config();
 console.log("EMAIL:", process.env.EMAIL);
console.log("PASS:", process.env.EMAIL_PASS);

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});


transporter.verify()
  .then(() => console.log("SMTP connected"))
  .catch((err) => {
    console.error("SMTP connection failed:", err.message);
  });
