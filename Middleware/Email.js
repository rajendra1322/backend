import {transporter} from "./Email.config.js"



export const SendVerification=async (email,verificationCode) => {
    try{
  const info = await transporter.sendMail({
    from: '"jioMart" <rajendraacharyarr@gmail.com>',
    to: email,
    subject: "verify your Email",
    text: `your verification code is:${verificationCode}`, // Plain-text version of the message
    html: `<h2>Your verification code is: ${verificationCode}</h2>` // HTML version of the message
  });
  console.log("Email send sucessfully");
}catch(err){
    console.log(err);
}
}
