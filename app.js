//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); //USE BCRYPT INSTEAD OF MD5 FOR SALTING AND HASHING
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

const saltRounds = 10; // BCRYPT SALTING PASSWORD FOR 10 ROUNDS

// post to the register route
app.post("/register",(req, res)=>{

    const newUser = req.body.username;

    //BCRYPT
    const hash = bcrypt.hashSync(req.body.password, saltRounds); //HASHES THE PASSWORD THAT USER ENTERS WITH SALTROUNDS

    const user = new User({
        email:newUser,
        password:hash
    });
    
    user.save().then(()=>{
        res.render("secrets");
    }).catch((err)=>{
        console.log(err);
    });
    

    
});

//post to the login route
app.post("/login", (req, res)=>{      
    
    const loginUser = req.body.username;               //email user enters in login page
    const loginpassword = req.body.password;           //password user enters in login page

    User.findOne({email:loginUser}).then((founduser)=>{     //finds one user inside user database whose email 
        if(founduser){                                      //matches user entered email in login page

            if(bcrypt.compareSync(loginpassword, founduser.password)){ //if user is found BCRYPT
                res.render("secrets");                  //compare user entered password with hashed password     
            }                                           //inside database if they match render secrets page 
        }                                                           
             
    }).catch((err)=>{
        console.log(err);
    });
    
      
                        
});

app.listen(3000, ()=>{
    console.log("server started");
});