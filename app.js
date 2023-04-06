//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption"); //ADDS MONGOOSE-ENCRYPTION
const ejs = require("ejs");

const app = express();

app.set("view engine", "ejs"); //setting ejs as view
app.use(bodyparser.urlencoded({extended:true})); //body-parser
app.use(express.static("public"));//using css folder as static

mongoose.connect(process.env.MONGO_URI); //connecting to mongodb url is in .env file
const { Schema } = mongoose; //default schema for mongoose

const userSchema = new Schema({        //new Schema
    email:String,
    password:String
});

//ENCRYPTS THE PASSWORD THE NEW ENTERS WHILE REGISTERING UISNG MONGOOSE-ENCRYPTION
userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});  //encrypt plugin for schema should be specified before mongoose.model

const User = mongoose.model("user", userSchema);  //new model

// get home route
app.get("/", (req, res)=>{
    res.render("home");
});

// get login route
app.get("/login", (req, res)=>{

    res.render("login");
});


// get register route
app.get("/register", (req, res)=>{
    res.render("register");
});


// post to the register route
app.post("/register",(req, res)=>{

    const newUser = req.body.username;
    const newPassword = req.body.password;

    const user = new User({
        email:newUser,
        password:newPassword
    });
    
    user.save().then(()=>{
        res.render("secrets");
    }).catch((err)=>{
        console.log(err);
    });

});

//post to the login route
app.post("/login", async (req, res)=>{      //async function used which is better then .then and catch

const loginUser = req.body.username;               //email user enters in login page
const loginpassword = req.body.password;           //password user enters in login page

try {                                               //using a try and catch instead of previouly used .then and .catch
    const check = await User.findOne({email:loginUser});   //await means to wait until user with email is found then execute below code
    if(check.password === loginpassword){                 //check the user entered password with the password in userDB
        res.render("secrets");                          // if password matches then render  secrets page
    }
} catch (error) {
    res.render(error);
}
   
});

app.listen(3000, ()=>{
    console.log("server started");
});