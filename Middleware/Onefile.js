import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export const SendVerification = async (toEmail, otp) => {
  try {
    const sendSmtpEmail = {
      to: [{ email: toEmail }],
      sender: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME },
      subject: "Your OTP Code",
      htmlContent: `<h2>Your OTP is: ${otp}</h2>`,
      textContent: `Your OTP is: ${otp}`
    };

    const response = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log("OTP email sent:", response);
  } catch (err) {
    console.error("Email sending error:", err.response?.body || err.message);
  }
};
// import nodemailer from "nodemailer";
// import dotenv from "dotenv";

// dotenv.config();

// // create transporter
// const transporter = nodemailer.createTransport({
//   host: "smtp.gmail.com",
//   port: 465,            
//   secure: true, 
//   auth: {
//     user: process.env.EMAIL,
//     pass: process.env.EMAIL_PASS,
//   },
//   family: 4,
//   tls: {
//     rejectUnauthorized: false,
//   },
// });

// // check connection
// transporter.verify((err, success) => {
//   if (err) {
//     console.log("SMTP error:", err);
//   } else {
//     console.log("SMTP ready");
//   }
// });

// // function to send OTP
// export const SendVerification = async (email, otp) => {
//   console.log("Sending to:", email);
//   console.log(process.env.EMAIL);
//   console.log(process.env.EMAIL_PASS);

//   try {
//     const info = await transporter.sendMail({
//       from: process.env.EMAIL,
//       to: email, // dynamic email from req.body
//       subject: "Verify using OTP",
//       text: "Your OTP is: " + otp,
//       html: `<h2>Your OTP is: ${otp}</h2>`,
//     });

//     console.log("Mail sent:", info);
//   } catch (err) {
//     console.log("Mail error:", err.message);
//   }
// };

