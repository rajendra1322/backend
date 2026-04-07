import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import{ SendVerification} from './Middleware/Onefile.js';
import dotenv from "dotenv";
import multer, { MulterError } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';


const app=express()
import cors from "cors";
app.use(cors({
  origin: "*", 
  credentials: true
}));
app.use(express.json());
dotenv.config();


mongoose.connect(process.env.MONGODB_URI)
.then(()=>console.log("mongodb connected.."))
.catch((err)=>console.log(err));

cloudinary.config({
    cloud_name:process.env.CLOUD_NAME,
    api_key:process.env.API_KEY,
    api_secret:process.env.API_SECRET,
});


app.get("/",(req,res)=>{
    res.send("server is ready")
})

const userSchema=mongoose.Schema({
    number:{
    type:String,
    required:true,
    unique:true,
    },
    email: {
    type: String,
    required: true,
    unique:true,
  },
    verificationCode:String
});


const user=mongoose.model("user",userSchema);



app.post("/signin", async (req, res) => {
    console.log("signin api hit...");
  try {
    const { number, email } = req.body;

    console.log("Request:", req.body);

    if (!/^[7-9]\d{9}$/.test(number)) {
      return res.json({ message: "Invalid number" });
    }

    let existingUser = await user.findOne({ email });

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (existingUser) {
      console.log("User exists → updating OTP");

      existingUser.verificationCode = verificationCode;
      await existingUser.save();

    } else {
      console.log("New user → creating");

      const newUser = new user({
        number,
        email: email.toLowerCase(),
        verificationCode,
      });

      await newUser.save();
    }
    await SendVerification(email, verificationCode);
    return res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Server error" });
  }
});
app.get("/getuser",async(req,res)=>{
    const femail=await user.find();
    if(!femail){
        res.json({message:"please signin first..."})
    }
    res.json(femail);
})

app.post("/verifyOTP",async(req,res)=>{
    const{otp,email}=req.body;
    
    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required"
      });
    }

    const existingUser = await user.findOne({
      email: email.toLowerCase()
      
    });
    
    if (!existingUser) {
        return res.json({ message: "User not found" });
    }
    console.log("DB OTP:", existingUser.verificationCode);
    console.log("Entered OTP:", otp);
    console.log(email);
    if(String(existingUser.verificationCode)===String(otp)){
        console.log(existingUser.verificationCode);
        console.log(otp);
        return res.json({message:"login sucessfullly.."});
    }
    else{
        return res.json({message:"Invalid OTP.."});

    }
    
    
    
})

const productSchema=mongoose.Schema({
    name:{
        type:String,
        required:true,
        unique:false,
    },
    quantity:{
        type:Number,
        required:true,
        unique:false,
    },
    price:{
        type:Number,
        required:true,
        unique:false,
    },
    image:{
        type:String,
        unique:false,
        required:true,
    },
    category:{
        type:String,
        unique:false,
        required:true,
    }
});
const product=mongoose.model("product",productSchema);


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


app.post("/addItems",upload.single("image"), async(req,res)=>{
    try{
        if (!req.file) {
            return res.status(400).json({ message: "Image is required" });
        }
        const streamUpload = (reqFile) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "products" },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(reqFile.buffer).pipe(stream);
      });
    };

    const result = await streamUpload(req.file);
        const obj={
            name:req.body.name,
            quantity:Number(req.body.quantity),
            price:Number(req.body.price),
            image:result.secure_url,
            category:req.body.category

        }
    await product.create(obj);
    return res.json({message:"product saved.."});
    }
    catch(err){
        console.log(err);
        return res.status(500).json({ message: "Server error while saving product" });
        
    }


})

app.get("/fetchProduct",async(req,res)=>{
    try{
    const items=await product.find();
    if (!items || items.length === 0) {
      console.log("product not found");
      return res.json([]);
    }
    return res.json(items)
    }
    catch(err){
        console.log(err);
        return res.status(500).json({ message: "Server error" });
    }
    
})

app.get("/product/:id",async(req,res)=>{
    try{
        const id=req.params.id;
        const productfound=await product.findById(id);
        if(!productfound){
            console.log("product not found..");
            return res.json([]);
        }
        return res.json(productfound);
    }
    catch(err){
        console.log(err);
    }
})
app.post("/getproductbyId",async(req,res)=>{
    try{
        const{ids}=req.body;
        const products=await Promise.all(
            ids.map(id=>product.findById(id))
        );
        const validpro=products.filter(p=>p!=null);
        res.json(validpro);

    }
    catch(err){
        console.log(err);
    }
})

const streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) resolve(result);
      else reject(error);
    });
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

app.put("/updateItems/:id",upload.single("image"),async(req,res)=>{
    try{
        const id=req.params.id;
        const updateData={
            name:req.body.name,
            quantity:req.body.quantity,
            price:req.body.price,
            category:req.body.category,
        }
            if (req.file) {
               const result = await streamUpload(req.file.buffer); 
               updateData.image = result.secure_url;
            }
    
        await product.findByIdAndUpdate(
            id,
            updateData,
            { returnDocument: "after" }
        );
        res.json({message:"update successfully done.."});

    }catch(err){
        console.log(err);
        return res.status(500).json({ message: "Error saving product" });
    }
})

import fs from 'fs';
import { type } from 'os';


app.delete("/deleteProduct/:id",async(req,res)=>{
    try{
    const deleted=req.params.id;
    const productdata=await product.findById(deleted);
    if (!productdata) {
      return res.status(404).json({ message: "Product not found" });
    }
    const imageUrl = productdata.image;
    const publicIdMatch = imageUrl.match(/\/products\/([^\.]+)\./);
    if (publicIdMatch && publicIdMatch[1]) {
      const publicId = `products/${publicIdMatch[1]}`;
      await cloudinary.uploader.destroy(publicId);
    }
    const deletedproduct=await product.findByIdAndDelete(deleted);
    res.json({message:"deleted succesfully"});
    
    }
    catch(err){
        console.log(err);
    }
})

const orderschema=mongoose.Schema({
    products:[{
    id:{
        type:String,
    },
    name:{
        type:String,
        required:true,
        unique:false,
    },
    quantity:{
        type:Number,
        required:true,
        unique:false,
    },
    price:{
        type:Number,
        required:true,
        unique:false,
    },
    image:{
        type:String,
        unique:false,
    },
    category:{type:String},
}],
users:[{
    id:{
        type:String,
    },
    usermail:{
        type:String,
        required:true,
    },
    phone:{
        type:String,
        required:true,
    },
    category:{
        type:String,
    }

}],
deliveryaddress:[{
 id:{type:String},
 Rname:{type:String},
 Rnumber:{type:String},
 pincode:{type:String},
 houseNumber:{type:String},
 area:{type:String},
 address:{type:String},
 building:{type:String},
}],
paymentType:String,
totalamount:Number,
createdAt:{
    type:Date,
    default:Date.now
}
    
});
const order=mongoose.model("order",orderschema);
app.post("/ordersave",async(req,res)=>{
    try{
    const{products,users,paymentType,deliveryaddress}=req.body;
    const usersArray = Array.isArray(users) ? users : [users];
    const formateduser=usersArray.map(user=>({
        id:user.id,
        usermail:user.email,
        phone:user.number,
    }))
    const fullproducts=await Promise.all(
        products.map(async(item)=>{
            const productdata=await product.findById(item.productId);
            if(!productdata){
                return null;
                
            }
            return {
                id:productdata.id,
                name:productdata.name,
                price:productdata.price,
                image:productdata.image,
                category:productdata.category,
                quantity:item.quantity
            };
        })
    );
    const validproduct=fullproducts.filter(p=>p!=null);
    const totalamount=validproduct.reduce((sum,item)=>{
        return sum+(item.quantity*item.price);
    },0)
    const neworder=new order({
        products:validproduct,
        users:formateduser,
        totalamount,
        paymentType,
        deliveryaddress
    })
    await neworder.save();
    console.log(neworder);
}
catch(err){
    console.log(err);
}

})
app.get("/getorder",async(req,res)=>{
    try{
    const details=await order.find();
    if(!order){
        res.json({message:"ordered product not found.."});
        return res.json([]);
    }
    res.json(details);
}
catch(err){
    console.log(err);
}
})
const port=process.env.PORT || 5000;

app.listen(port,()=>{
    console.log(`Server at http://localhost:${port}`)
})
