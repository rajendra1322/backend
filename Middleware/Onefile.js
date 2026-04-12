import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export const SendVerification = async (toEmail, otp) => {
  try {
    const cleanEmail = toEmail.toLowerCase();
    const sendSmtpEmail = {
      to: [{ email: cleanEmail }],
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

export const SendConfirmation = async (toEmail, order) => {
  try {
    if (!toEmail) return;

    const sendSmtpEmail = {
      to: [{ email: toEmail }],
      sender: {
        email: process.env.FROM_EMAIL,
        name: process.env.FROM_NAME,
      },
      subject: "Order Confirmation",
      htmlContent: `
        <div style="font-family: Arial; padding: 15px;">
          <h2>₹${order.totalamount}</h2>
          <p style="color: green;"><b>Order Placed Successfully</b></p>

          <p><b>Order ID:</b> ${order._id}</p>
          <p><b>Payment Method:</b> ${order.paymentType}</p>
          <p><b>Status:</b> ${order.status}</p>

          <p><b>Paid On:</b> ${new Date(order.createdAt).toLocaleString()}</p>

          <p><b>Email:</b> ${toEmail}</p>
          <p><b>Mobile:</b> ${order.users?.[0]?.phone}</p>

          <br/>
          <p>Thank you for shopping with us 🙏</p>
        </div>
      `,
      textContent: `Order of ₹${order.totalamount} placed successfully`,
    };

    await tranEmailApi.sendTransacEmail(sendSmtpEmail);

  } catch (err) {
    console.error(err.response?.body || err.message);
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

