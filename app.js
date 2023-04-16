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
    googleId:String,                //ADDS  GOOGLEID TO AVIOD SAVING SAME USER TWICE
    secret:String                  //ADDS NEW SECRET FIELD FOR SUBMITTING SECRET
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
app.get("/secrets", async (req, res)=>{
   try {
    const findUsersecrets = await User.find({"secret": {$ne: null}},); //FIND ALL THE USERS SECRET FIELD WHOSE
     if (findUsersecrets) {                                            //VALUE IS NOT EQUAL TO NULL OR NOT EMPTY SECRET FIELD
        res.render("secrets",{findUsersecrets:findUsersecrets});  //IF FOUND RENDER SECRETS PAGE
     }                                                          //AND DISPLAY ALL USERS SECRETS IN SECRETS PAGE


   } catch (error) {
    console.log(error);
   }
    
});



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

//==============================================================================================================

//GET SUBMIT ROUTE
app.get("/submit", (req, res)=>{
    if (req.isAuthenticated) {              //IF USER AUTH RENDER SUBMIT ELSE REDIRECT TO LOGIN
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

//POST TO THE SUBMIT ROUTE
app.post("/submit", async (req, res)=>{  //ASYNC FUNCTION

    const submitSecret = req.body.secret;  //USER SUBMITTED SECRET

try {
    const userSecret = await User.findById(req.user.id); //FIND USERS BY ID AND ADD SUBMITTED SECRET 
    if (userSecret) {                                    
        userSecret.secret = submitSecret;             //TO THERE SECRET FIELD
        userSecret.save();                            //SAVE USER AND REDIRECT TO SECRETS
        res.redirect("/secrets");
    }
} catch (error) {
    console.log(error);
}
    


});

app.listen(3000, ()=>{
    console.log("server started");
});