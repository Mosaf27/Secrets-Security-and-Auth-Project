//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const session = require("express-session"); //EXPRESS-SESSION
const passport = require("passport"); //PASSPORT
const passportLocalMongoose = require("passport-local-mongoose"); //PASSPORT-LOCAL-MONGOOSE
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy; //ADDS GOOGLE OAUTH2
const findOrCreate = require("mongoose-findorcreate"); //ADDS MONGOOSE-FIND OR CREATE


const app = express();

app.set("view engine", "ejs"); //setting ejs as view
app.use(bodyparser.urlencoded({extended:true})); //body-parser
app.use(express.static("public"));//using css folder as static

app.use(session({                             //SETTING UP SESSION
    secret:process.env.SESSION_ID, //SESSION ID IN ENV FILE
    resave:false,
    saveUninitialized:false,

}));
app.use(passport.initialize());    //SETTING UP PASSPORT

app.use(passport.session());   //TELLING PASSPORT TO INITIALIZE SESSION

//============================================================================================================

mongoose.connect(process.env.MONGO_URI); //connecting to mongodb url is in .env file
const { Schema } = mongoose; //default schema for mongoose

const userSchema = new Schema({        //new Schema
    email:String,
    password:String,
    googleId:String                 //ADDS  GOOGLEID TO AVIOD SAVING SAME USER TWICE
});

userSchema.plugin(passportLocalMongoose); //plugin Passport-Local Mongoose into your User schema
// Passport-Local Mongoose will add a username, hash and salt field to store the username, the hashed password and the salt value.

userSchema.plugin(findOrCreate); //PLUGIN MONGOOSE-FINDORCREATE TO USERSCHEMA

const User = mongoose.model("user", userSchema);  //new model

//============================================================================================================

passport.use(User.createStrategy()); //Easy way to configure passport-local-mongoose FROM PASSPORT DOCS


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


passport.use(new GoogleStrategy({               //The Google OAuth 2.0 authentication strategy       
    clientID: process.env.CLIENT_ID,           // authenticates users using a Google account and OAuth 2.0 tokens
    clientSecret: process.env.CLIENT_SECRET,           //from passport docs
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function (err, user) { //AFTER AUTH ADD OR FIND THE USER
            return cb(err, user);                                         //WITH THE GOOGLEID
        });
    }
));

//===========================================================================================================

//USER WILL BE REDIRECTED TO THIS PATH IF THEY CHOOSE AUTHENTICATE WITH GOOGLE 
app.get('/auth/google',
  passport.authenticate('google', { scope:
      [ 'email', 'profile' ] }
));

//AFTER USERD ARE AUTHENTICATED WITH GOOGLE THEY WILL REDIRECTED HERE
app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets', //IF AUTHENTICATED SECRETS ROUTE
        failureRedirect: '/login'    //ELSE LOGIN ROUTE
}));

//===========================================================================================================

// get home route
app.get("/", (req, res)=>{
    res.render("home");
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


//=============================================================================================================

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



//===========================================================================================================

// get login route
app.get("/login", (req, res)=>{

    res.render("login");
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

//=============================================================================================================
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