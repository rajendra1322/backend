import nodemailer from 'nodemailer'

 export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use true for port 465, false for port 587
  auth: {
    user: "rajendraacharyarr@gmail.com",
    pass: process.env.EMAIL_PASS
    
  },
});

transporter.verify()
  .then(() => console.log("SMTP Connected"))
  .catch(err => console.log(err));