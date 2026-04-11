import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

export const SendConfirmation = async (toEmail,totalamount) => {
  try {
    const sendSmtpEmail = {
      to: [{ usermail: toEmail }],
      sender: { email: process.env.FROM_EMAIL, name: process.env.FROM_NAME },
      subject: "Your order has been placed ",
      htmlContent: `<h2>user mailID: ${usermail},totalAmount is:{totalamount}</h2>`,
      textContent: `user mailID: ${usermail} ,totalAmount is:{totalamount}`
    };

    const response = await tranEmailApi.sendTransacEmail(sendSmtpEmail);
    console.log("OTP email sent:", response);
  } catch (err) {
    console.error("Email sending error:", err.response?.body || err.message);
  }
};