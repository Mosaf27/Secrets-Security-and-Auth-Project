//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session"); //EXPRESS-SESSION
const passport = require("passport"); //PASSPORT
const passportLocalMongoose = require("passport-local-mongoose"); //PASSPORT-LOCAL-MONGOOSE


const app = express();

app.set("view engine", "ejs"); //setting ejs as view
app.use(bodyparser.urlencoded({extended:true})); //body-parser
app.use(express.static("public"));//using css folder as static


app.use(session({                             //SETTING UP SESSION
    secret:"Our little secret",
    resave:false,
    saveUninitialized:false,

}));

app.use(passport.initialize());    //SETTING UP PASSPORT

app.use(passport.session());   //TELLING PASSPORT TO INITIALIZE SESSION

mongoose.connect(process.env.MONGO_URI); //connecting to mongodb url is in .env file
const { Schema } = mongoose; //default schema for mongoose

const userSchema = new Schema({        //new Schema
    email:String,
    password:String
});

userSchema.plugin(passportLocalMongoose); //plugin Passport-Local Mongoose into your User schema
// Passport-Local Mongoose will add a username, hash and salt field to store the username, the hashed password and the salt value.

const User = mongoose.model("user", userSchema);  //new model

passport.use(User.createStrategy()); //Easy way to configure passport-local-mongoose



passport.serializeUser(function(user, done) {       //serializing user
    process.nextTick(function() {
        done(null, { id: user._id, username: user.username });
    });
});

passport.deserializeUser(function(user, done) {    //deserializing user
    process.nextTick(function() {
        return done(null, user);
    });
});

// get home route
app.get("/", (req, res)=>{
    res.render("home");
});

// get login route
app.get("/login", (req, res)=>{

    res.render("login");
});

//get secrets route
app.get("/secrets", (req, res)=>{
    if(req.isAuthenticated()){    //here if the user is authenticated and saved in session
                                 // in register route or login route secrets page gets rendered until the browser gets closed
        res.render('secrets');
    }else{
        res.redirect("/login"); //if the browser is closed session and cookies are deleted and login page is rendered
    }
})

// get register route
app.get("/register", (req, res)=>{

res.render("register");
 
});


// post to the register route
app.post("/register",async (req, res)=>{

    try {
        //User tries to register with username and password
        const registerUser = await User.register(
            {username: req.body.username}, req.body.password
        );

        if(registerUser){
           //user gets authenticated and session is saved and cookies are created 
                passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");  //then user gets redirected to secrets route
});
        }else{
            res.redirect("/register");
        }
    } catch(err){
             res.send(err);
    }
    
    


    });




//post to the login route
app.post("/login", (req, res)=>{  

    const user = new User({            //user logins with password and username
		username: req.body.username,
		password: req.body.password
	});
 
	req.login(user, (err) => {          //passport login keyword autheticates and logs user in
		if (err) {
			console.log(err);
		} else {
			passport.authenticate("local")(req, res, function() {     
				res.redirect("/secrets");           //redirects to secrets page
			});
		}
	});
    
                        
});

//req.logout route
app.get("/logout", (req, res, next) => {
    
	req.logout((err)=> {                    //if the user loges out redirect to home page
		if (err) {                          //req.logout is a passport keyword
			return next(err);
		}
		res.redirect('/');
	});
});

app.listen(3000, ()=>{
    console.log("server started");
});