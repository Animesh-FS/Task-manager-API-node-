const mongoose = require('mongoose');
const validator =require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./task');
const userSchema = new mongoose.Schema({
    name : {
        type : String,
        required : true,
        trim : true
    },
    email : {
        type : String,
        unique : true,
        required : true,
        trim : true,
        lowercase : true,
        validate(value) {
            if(!validator.isEmail(value)) {
                throw new Error("Email is Invalid")
            }
        }
    },
    password : {
        type : String,
        required : true,
        trim: true,
        minlength : 7,
        validate(value){
            if(value.toLowerCase().includes('password')){
                throw new Error("Password cannot be password");
            }
        }
    },
    age : {
        type : Number,
        default : 0,
        validate(value){
            if(value < 0){
                throw new Error("Positive value only")
            }
        }
    },
    tokens :[{
        token:{
            type:String,
            required:true
        }
    }],
    avatar:{
        type : Buffer
    }
},{
    timestamps : true
});

userSchema.methods.toJSON = function(){
    const user = this ;
    const userObj = user.toObject();
   
    delete userObj.password;
    delete userObj.tokens;
    delete userObj.avatar;
   
    return userObj;
}

userSchema.virtual('tasks',{
    ref:'Tasks',
    localField:'_id',
    foreignField:'owner'
})

//generate token(method)
userSchema.methods.generateToken = async function(){
    const user = this;
    const token = await jwt.sign({__id:user._id.toString()},process.env.JWT_TOKEN,{expiresIn : '7 Days'});
    user.tokens = user.tokens.concat({token});
    await user.save()
    return token;
}


//login check(model method)
userSchema.statics.findByCredentials = async (email,password) =>{
    const user = await User.findOne({email});
    if(!user){
        throw new Error('Unable to login')
    }
    const isMatch = await bcrypt.compare(password,user.password); 
    if(!isMatch){
        throw new Error('Unable to login')
    }
    return user;
}

//delete task if owner is removed
userSchema.pre('remove',async function(next){
    const user = this;
    await Task.deleteMany({owner:user._id})
    next();
})

//save hash password before saving
userSchema.pre('save',async function(next){
    const user = this;
    if(user.isModified('password'))
    {
        user.password =await bcrypt.hash(user.password,8)
    }
    next();
})
const User = mongoose.model('User',userSchema);


module.exports = User;