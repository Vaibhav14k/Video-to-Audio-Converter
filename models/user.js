const mongoose = require("mongoose");
mongoose.connect("mongodb://127.0.0.1:27017/miniproject");

const userSchem = mongoose.Schema({
    username:String,
    name:String,
    age:String,
    email:String,
    password:String,
    profilepic:{
        type:String,
        default:"defaultpic.avif"
    },
    post:[{
        type:mongoose.Schema.Types.ObjectId , 
        ref:"post"
    }],
    downloadsCount: {
        type: Number,
        default: 0,  // Initialize with 0
    }
});


module.exports = mongoose.model("user",userSchem)