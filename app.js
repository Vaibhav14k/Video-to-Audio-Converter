const express =  require("express")
const app=express();
const userModel = require("./models/user");

const cookieParser = require("cookie-parser");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto= require("crypto")
const multer = require("multer");
const path = require("path");
const uploadd= require("./config/multerconfig");
const { freemem } = require("os");
const axios = require('axios');
require("dotenv").config();
//
const session = require("express-session");


app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"public")));
app.use(cookieParser());
//
app.use(session({
    secret: "token_name",
    resave: false,
    saveUninitialized: true
}));
// app.use((req, res, next) => {
//     if (!req.session.downloadCount) {
//         req.session.downloadCount = 0;
//     }
//     next();
// });
app.use((req, res, next) => {
    if (!req.session.downloadCount) {
        req.session.downloadCount = 0;
    }
    next();
});


app.get("/",function(req,res){
    // res.render("home")
    res.render("home", { token_name: req.cookies.token_name });
})
app.get("/profile/upload",function(req,res){
    res.render("test")
})
app.get("/aboutus",function(req,res){
    res.render("aboutus");
})
app.get("/test",function(req,res){
    res.render("test")
})
app.post("/upload", isloggedin ,uploadd.single("images")  ,async function(req,res){
    let user = await userModel.findOne({email:req.user.email});
    user.profilepic= req.file.filename;
    await user.save();
    res.redirect("profile");
})
app.get("/profile",isloggedin, async function(req,res){
    let user = await userModel.findOne({email:req.user.email}).populate("post");
    console.log(user) 
    res.render("profile",{user})
})

app.post("/post",isloggedin, async function(req,res){
    let user = await userModel.findOne({email:req.user.email});
    let {content} =req.body
    let post = await postModel.create({
        user:user._id,
        content:content
    })
    user.post.push(post._id)
    console.log(user.content)
    await user.save();
    res.redirect("/profile")
})
app.post("/register",async function(req,res){
    let {name,username,email,password,age} = req.body
    // first check any user is already exit 
    let user =await userModel.findOne({email}); 
    if (user){ return res.status(300).send("user is already registerrrrr ")} 
    bcrypt.genSalt(10,(err,salt)=>{
        bcrypt.hash(req.body.password, salt, async (err,hash)=>{
            let user = await userModel.create({
                username,
                password:hash,
                email,
                name,
                age
            })
            console.log(hash);
            let token = jwt.sign({email:req.body.email , userid:req.body._id },"market")
            res.cookie("token_name",token)
            res.send("regisister done  : ");
            console.log(user)
        } )
    }) 
})  
app.get("/login", isloggedin,  function(req,res){
    res.render("login");
})
app.post("/login", async function(req,res){
    let {email,password,} = req.body
    //  if user is not exit thorw an error : 
    let user =await userModel.findOne({email}); 
    if (!user) return res.status(300).send("user is already register ");    
    bcrypt.compare(password, user.password ,function(err,result){
        if (result){
            let token = jwt.sign({email:req.body.email , userid:user._id },"market")
            res.cookie("token_name",token);
            res.redirect("/");
            
        } 
        else console.log("something went wrong ");
    })
    
}) 
app.get("/creatacount" , function(req,res){
    res.render("index");
})
app.get("/logout",function(req,res){
    res.cookie("token_name", "")
    res.redirect("/login");
})


app.post("/convert-mp3", checkDownloadLimit, async function (req, res) {
    let videoUrl = req.body.videoURL;
    
    if (!videoUrl) {
        return res.render("home", { success: false, message: "Please enter a valid YouTube URL." });
    }

    // Function to extract video ID from different YouTube URL formats
    function extractVideoID(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    const videoId = extractVideoID(videoUrl);
    
    if (!videoId) {
        return res.render("home", { success: false, message: "Invalid YouTube URL format." });
    }

    try {
        const fetchapi = await axios.get(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
            method: "GET",
            headers: {
                "x-rapidapi-key": process.env.API_KEY,
                "x-rapidapi-host": process.env.API_HOST 
            }
        });

        const fetchresponse = fetchapi.data;

        if (fetchresponse.message === "You are not subscribed to this API.") {
            return res.render("home", {
                success: false,
                message: "Error: You are not subscribed to this API. Please check your RapidAPI subscription."
            });
        }

        if (fetchresponse.status === "ok") {
            return res.render("home", {
                success: true,
                song_title: fetchresponse.title, 
                song_link: fetchresponse.link 
            });
        } else {
            return res.render("home", { success: false, message: fetchresponse.message || "Failed to convert." });
        }
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);

        if (error.response && error.response.status === 401) {
            return res.render("home", { success: false, message: "Unauthorized: Invalid API key or subscription issue." });
        }

        return res.render("home", { success: false, message: "An error occurred. Please try again later." });
    }
});

async function isloggedin(req, res, next) {
    try {
        // Check if the token_name cookie exists
        const token = req.cookies.token_name;
        if (!token) {
            return res.status(401).render("login");
        }

        // Verify the token
        const data = await jwt.verify(token, "market");
        req.user = data; // Attach the user data to the request
        next(); // Proceed to the next middleware
    } catch (error) {
        console.error(error);
        return res.status(401).send("Invalid or expired token. Please log in again.");
    }
}

function checkDownloadLimit(req, res, next) {
    const token = req.cookies.token_name;

    if (!token) {
        // User is not logged in
        if (req.session.downloadCount >= 3) {
            return res.redirect("/login");
        }
        req.session.downloadCount += 1;
    }
    next();
}
app.listen(7000,(req,res)=>{
    console.log("server start at 7000");
})