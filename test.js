import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();



const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

async function test() {
  try {
    console.log("🚀 Sending...");

    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: "23cs11.rajendra@sjec.ac.in", // send to yourself
      subject: "Test Mail",
      text: "Hello from Gmail SMTP",
    });

    console.log("✅ SUCCESS:", info);

  } catch (err) {
    console.log("❌ ERROR:", err);
  }
}

test();