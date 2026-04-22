import QRCode from "qrcode";

const generateQRCode = async (orderId) => {
  try {
    const url = `http://localhost:5173/useraccount?orderId=${orderId}`;
    
    const qrImage = await QRCode.toDataURL(url); // base64 image
    
    return qrImage;
  } catch (err) {
    console.error("QR Error:", err);
  }
};

export default generateQRCode;