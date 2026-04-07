import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,            
  secure: true, 
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
  tls: {
    rejectUnauthorized: false,
  },
});

// check connection
transporter.verify((err, success) => {
  if (err) {
    console.log("SMTP error:", err);
  } else {
    console.log("SMTP ready");
  }
});

// function to send OTP
export const SendVerification = async (email, otp) => {
  console.log("Sending to:", email);
  console.log(process.env.EMAIL);
  console.log(process.env.EMAIL_PASS);

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL,
      to: email, // dynamic email from req.body
      subject: "Verify using OTP",
      text: "Your OTP is: " + otp,
      html: `<h2>Your OTP is: ${otp}</h2>`,
    });

    console.log("Mail sent:", info);
  } catch (err) {
    console.log("Mail error:", err.message);
  }
};