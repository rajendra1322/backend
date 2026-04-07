import {transporter} from "./Email.config.js"

export const SendVerification=async (email,verificationCode) => {
  console.log("email is..",email);
 
    try{
  const info = await transporter.sendMail({
    from: process.env.EMAIL ,
    to: "rajendracharyarr@gmail.com",
    subject: "Verify using OTP",
    text: `Your verification code is: ${verificationCode}`,
    html: `<h2>Your verification code is: ${verificationCode}</h2>`
  });
  console.log("Email sent successfully",info);
}catch(err){
    console.log(err.message);
    throw err;
}
}
