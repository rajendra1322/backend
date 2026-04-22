import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { SendVerification } from './Middleware/Onefile.js';
import { SendConfirmation } from './Middleware/Onefile.js';
import generateModernInvoice from './utility/generateModernInvoice.js'
import path from 'path';
import dotenv from "dotenv";
import multer, { MulterError } from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import Groq from "groq-sdk";
import OpenAI from "openai";




const app = express();
const allowedOrigins = [
    "http://localhost:5173",
    "https://rajmart.vercel.app"
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
dotenv.config();


mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("mongodb connected.."))
    .catch((err) => console.log(err));

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});


app.get("/", (req, res) => {
    res.send("server is ready")
})

const userSchema = mongoose.Schema({
    number: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    verificationCode: String
});


const user = mongoose.model("user", userSchema);

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.userId = decoded.userId;

        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

app.post("/signin", async (req, res) => {
    try {
        const { number, email } = req.body;

        if (!/^[7-9]\d{9}$/.test(number)) {
            return res.json({ message: "Invalid number" });
        }

        const cleanEmail = email.toLowerCase().trim();

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // ✅ SINGLE ATOMIC OPERATION
        await user.findOneAndUpdate(
            { email: cleanEmail },     // find
            {
                number,
                verificationCode
            },
            {
                upsert: true,          // create if not exists
                new: true,
                setDefaultsOnInsert: true
            }
        );

        await SendVerification(cleanEmail, verificationCode);

        return res.json({ message: "OTP sent successfully" });

    } catch (err) {
        console.log(err);

        if (err.code === 11000) {
            return res.status(400).json({ message: "Duplicate user error" });
        }

        return res.status(500).json({ message: "Server error" });
    }
});
app.get("/getuser", verifyToken, async (req, res) => {
    try {
        const u = await user.findById(req.userId);

        if (!u) {
            return res.status(404).json({ message: "User not found" });
        }

        res.json(u);

    } catch (err) {
        res.status(500).json({ message: "Error fetching user" });
    }
});

app.get("/getalluser", async (req, res) => {
    try {
        const users = await user.find();
        if (!users || users.length === 0) {
            console.log("user Not found")
            return res.json({ message: "user Not found" });
        }
        res.json(users);

    }
    catch (err) {
        console.log(err);
    }

})

app.post("/verifyOTP", async (req, res) => {
    try {
        const { otp, email } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP required" });
        }

        const cleanEmail = email.toLowerCase();

        const existingUser = await user.findOne({ email: cleanEmail });

        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!existingUser.verificationCode) {
            return res.status(400).json({ message: "OTP not generated" });
        }

        if (String(existingUser.verificationCode) !== String(otp)) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        const token = jwt.sign(
            { userId: existingUser._id },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            message: "Login successful",
            token,
            userId: existingUser._id
        });

    } catch (err) {
        console.log("OTP ERROR:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

const productSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: false,
    },
    quantity: {
        type: Number,
        required: true,
        unique: false,
    },
    price: {
        type: Number,
        required: true,
        unique: false,
    },
    image: {
        type: String,
        unique: false,
        required: true,
    },
    category: {
        type: String,
        unique: false,
        required: true,
    },
    description: {
        type: String,
        default: ""
    }
});
const product = mongoose.model("product", productSchema);


const storage = multer.memoryStorage();
const upload = multer({ storage: storage });




const groq = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
});
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

app.post("/addItems", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Image is required" });
        }

        const result = await streamUpload(req.file);
        let description = "High quality product available at best price.";

        try {
            const response = await groq.responses.create({
                model: "llama-3.1-8b-instant",
                input: `
Write a clean product description in plain text.

Rules:
- Do NOT use markdown (**)
- Do NOT use bullet points
- Do NOT use special symbols
- Use simple sentences (4–5 lines)

Product: ${req.body.name}
Category: ${req.body.category}
Price: ₹${req.body.price}
`,
            });

            description =
                (response.output_text ||
                    response.output?.[0]?.content?.[0]?.text ||
                    description)
                    .replace(/\*\*/g, "")
                    .replace(/\n/g, " ");

        } catch (err) {
            console.log("Groq error:", err);
        }
        const obj = {
            name: req.body.name,
            quantity: Number(req.body.quantity),
            price: Number(req.body.price),
            image: result.secure_url,
            category: req.body.category,
            description

        }
        await product.create(obj);
        console.log(obj);
        return res.json({ message: "product saved.." });

    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error while saving product" });

    }


})

app.get("/fetchProduct", async (req, res) => {
    try {
        const items = await product.find();
        if (!items || items.length === 0) {
            console.log("product not found");
            return res.json([]);
        }
        return res.json(items)
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
    }

})

app.get("/product/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const productfound = await product.findById(id);
        if (!productfound) {
            console.log("product not found..");
            return res.json([]);
        }
        return res.json(productfound);
    }
    catch (err) {
        console.log(err);
    }
})
app.post("/getproductbyId", async (req, res) => {
    try {
        const { ids } = req.body;
        const products = await Promise.all(
            ids.map(id => product.findById(id))
        );
        const validpro = products.filter(p => p != null);
        res.json(validpro);

    }
    catch (err) {
        console.log(err);
    }
})



app.put("/updateItems/:id", upload.single("image"), async (req, res) => {
    try {
        const id = req.params.id;
        const updateData = {
            name: req.body.name,
            quantity: req.body.quantity,
            price: req.body.price,
            category: req.body.category,
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
        res.json({ message: "update successfully done.." });

    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Error saving product" });
    }
})




app.delete("/deleteProduct/:id", async (req, res) => {
    try {
        const deleted = req.params.id;
        const productdata = await product.findById(deleted);
        if (!productdata) {
            return res.status(404).json({ message: "Product not found" });
        }
        const imageUrl = productdata.image;
        const publicIdMatch = imageUrl.match(/\/products\/([^\.]+)\./);
        if (publicIdMatch && publicIdMatch[1]) {
            const publicId = `products/${publicIdMatch[1]}`;
            await cloudinary.uploader.destroy(publicId);
        }
        const deletedproduct = await product.findByIdAndDelete(deleted);
        res.json({ message: "deleted succesfully" });

    }
    catch (err) {
        console.log(err);
    }
})

const orderschema = mongoose.Schema({
    products: [{
        id: {
            type: String,
        },
        name: {
            type: String,
            required: true,
            unique: false,
        },
        quantity: {
            type: Number,
            required: true,
            unique: false,
        },
        price: {
            type: Number,
            required: true,
            unique: false,
        },
        image: {
            type: String,
            unique: false,
        },
        category: { type: String },
    }],
    users: [{
        id: {
            type: String,
        },
        usermail: {
            type: String,
            required: true,
        },
        phone: {
            type: String,
            required: true,
        }

    }],
    deliveryaddress: [{
        id: { type: String },
        Rname: { type: String },
        Rnumber: { type: String },
        pincode: { type: String },
        houseNumber: { type: String },
        area: { type: String },
        address: { type: String },
        building: { type: String },
    }],
    paymentType: String,
    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,
    paymentStatus: {
        type: String,
        enum: ["pending", "success", "failed"],
        default: "pending",
    },
    totalamount: Number,
    createdAt: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: [
            "Placed",
            "Confirmed",
            "Packed",
            "Shipped",
            "Out for Delivery",
            "Delivered",
            "Cancelled",
        ],
        default: "Placed",
    },


}, { timestamps: true });



const order = mongoose.model("order", orderschema);
app.post("/ordersave", verifyToken, async (req, res) => {
    try {
        const { products, paymentType, deliveryaddress } = req.body;
        const dbUser = await user.findById(req.userId);
        if (!dbUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const formateduser = [{
            id: dbUser._id,
            usermail: dbUser.email,
            phone: dbUser.number,
        }];
        const fullproducts = await Promise.all(
            products.map(async (item) => {
                const productdata = await product.findById(item.productId);
                if (!productdata) {
                    return null;

                }
                return {
                    id: productdata._id,
                    name: productdata.name,
                    price: productdata.price,
                    image: productdata.image,
                    category: productdata.category,
                    quantity: item.quantity
                };
            })
        );
        const validproduct = fullproducts.filter(p => p != null);
        const totalamount = validproduct.reduce((sum, item) => {
            return sum + (item.quantity * item.price);
        }, 0)
        const neworder = new order({
            products: validproduct,
            users: formateduser,
            totalamount,
            paymentType,
            deliveryaddress
        })
        await neworder.save();
        const userEmail = formateduser[0]?.usermail;
        if (!userEmail) {
            return res.status(404).json({ message: "User not found" });
        }
        let pdfBuffer = null;
        try {
            pdfBuffer = await generateModernInvoice(neworder);
            console.log("PDF Size:", pdfBuffer?.length);
        } catch (pdfErr) {
            console.error("PDF Generation Failed :", pdfErr.message);
        }


        if (userEmail && pdfBuffer && pdfBuffer.length > 0) {
            try {
                await SendConfirmation(userEmail, neworder, pdfBuffer);
                console.log("Email sent successfully ");
            } catch (mailErr) {
                console.error("Email sending failed :", mailErr.message);
            }
        } else {
            console.log("Skipping email (missing email or PDF)");
        }
        return res.json({ message: "Order saved successfully" });


    }
    catch (err) {
        console.log("ORDER ERROR:", err);
        return res.status(500).json({ message: "Order not saved", error: err.message });
    }
})

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/razorpayorder", verifyToken, async (req, res) => {
    try {
        const { products } = req.body;

        if (!products || products.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        const fullproducts = await Promise.all(
            products.map(async (item) => {
                const productdata = await product.findById(item.productId);
                if (!productdata) return null;

                return {
                    price: productdata.price,
                    quantity: item.quantity
                };
            })
        );

        const validProducts = fullproducts.filter(item => item !== null);

        if (validProducts.length === 0) {
            return res.status(400).json({ message: "Invalid products" });
        }

        const total = validProducts.reduce((sum, item) => {
            return sum + item.price * item.quantity;
        }, 0);

        if (total <= 0) {
            return res.status(400).json({ message: "Invalid amount" });
        }

        console.log("Total Amount:", total);

        const options = {
            amount: Math.round(total * 100),
            currency: "INR",
            receipt: "order_" + Date.now(),
        };

        const order = await razorpay.orders.create(options);
        console.log("created order:", order);
        res.json(order);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
});

app.post("/verify-razorpay", verifyToken, async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            products,
            deliveryaddress
        } = req.body;

        const dbUser = await user.findById(req.userId);
        if (!dbUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const fullproducts = await Promise.all(
            products.map(async (item) => {
                const id = item.productId || item._id;

                if (!id) {
                    console.log(" Missing ID:", item);
                    return null;
                }

                const productdata = await product.findById(id);

                if (!productdata) {
                    console.log(" Product not found:", id);
                    return null;
                }

                return {
                    id: productdata.id,
                    name: productdata.name,
                    price: productdata.price,
                    image: productdata.image,
                    category: productdata.category,
                    quantity: item.quantity
                };
            })
        );

        const validproduct = fullproducts.filter(p => p != null);



        const totalamount = validproduct.reduce((sum, item) => {
            return sum + (item.quantity * item.price);
        }, 0);


        const formattedUsers = [{
            id: dbUser._id,
            usermail: dbUser.email,
            phone: dbUser.number
        }];

        console.log("STEP 4: Users OK");

        const neworder = new order({
            products: validproduct,
            users: formattedUsers,
            deliveryaddress,
            totalamount,
            paymentType: "Online (Razorpay)",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paymentStatus: "success"
        });

        await neworder.save();
        let pdfBuffer = null;
        try {
            pdfBuffer = await generateModernInvoice(neworder);
        } catch (err) {
            console.log("PDF error:", err.message);
        }

        // Send email with invoice
        if (dbUser.email && pdfBuffer) {
            try {
                await SendConfirmation(dbUser.email, neworder, pdfBuffer);
                console.log("Email sent");
            } catch (err) {
                console.log("Email error:", err.message);
            }
        }
        return res.json({ success: true });

    } catch (err) {
        console.log(" ERROR IN VERIFY:", err);
        return res.json({ success: false, error: err.message });
    }
});
app.get("/getorder", verifyToken, async (req, res) => {
    try {
        const details = await order.find();
        if (!details || details.length === 0) {
            return res.json([]);
        }
        res.json(details);
    }
    catch (err) {
        console.log(err);
    }
})

app.put("/status/:id", async (req, res) => {
    try {
        const { status } = req.body;

        const updatedOrder = await order.findByIdAndUpdate(
            req.params.id,
            { status },
            { returnDocument: "after" }
        );

        res.json(updatedOrder);
    } catch (err) {
        res.status(500).json({ message: "Error updating status" });
    }
});


app.get("/status/orders", async (req, res) => {
    const orders = await order.find().sort({ createdAt: -1 });
    res.json(orders);
});

app.get("/myorders", verifyToken, async (req, res) => {
    try {
        const orders = await order.find({
            "users.id": req.userId
        }).sort({ createdAt: -1 });

        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: "Error fetching orders" });
    }
});



app.get("/admin/stats", async (req, res) => {
    try {
        const totalUsers = await user.countDocuments();
        const totalProducts = await product.countDocuments();

        const orders = await order.find();
        console.log(orders);
        const totalRevenue = orders.reduce((acc, item) => {
            return acc + Number(item.totalamount || 0);
        }, 0);

        res.json({
            totalUsers,
            totalProducts,
            totalRevenue
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


app.get("/admin/revenue-chart", async (req, res) => {
    const orders = await order.find();

    const monthlyData = {};

    orders.forEach(item => {
        const month = new Date(item.createdAt).toLocaleString("default", { month: "short" });

        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }

        monthlyData[month] += Number(item.totalamount || 0);
    });

    const result = Object.keys(monthlyData).map(month => ({
        month,
        revenue: monthlyData[month]
    }));

    res.json(result);
});

app.get("/api/orders/:id", verifyToken, async (req, res) => {
    try {
        const foundOrder = await order.findById(req.params.id);

        if (!foundOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        // ✅ SECURITY CHECK (VERY IMPORTANT)
        const isOwner = foundOrder.users.some(
            (u) => u.id.toString() === req.userId
        );

        if (!isOwner) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        res.json(foundOrder);

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Server error" });
    }
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
    console.log(`Server at http://localhost:${port}`)
})
