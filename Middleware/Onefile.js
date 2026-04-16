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

export const SendConfirmation = async (toEmail, order,filePath) => {
  try {
    if (!toEmail) return;
    const fileContent = fs.readFileSync(filePath).toString("base64");

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

       attachments: [
        {
          name: "invoice.pdf",
          content: fileContent,
        },
      ],
    };
   

    await tranEmailApi.sendTransacEmail(sendSmtpEmail);

  } catch (err) {
    console.error(err.response?.body || err.message);
  }
};
