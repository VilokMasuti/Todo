import mongoose, { type Document, type Model, Schema } from "mongoose"
import bcrypt from "bcryptjs"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  role: "admin" | "manager" | "user"
  createdAt: Date
  updatedAt: Date
  comparePassword: (candidatePassword: string) => Promise<boolean>
}
const UserSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, "Please provide a name"],
    maxlength: [60, "Name cannot be more than 60 characters"],
  },
  email: {
    type: String,
    required: [true, "Please provide an email"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minlength: [8, "Password must be at least 8 characters"],
    select: false, // Don't return password by default
  },
  role: {
    type: String,
    enum: ["admin", "manager", "user"],
    default: "user",
  },

}, {
  timestamps: true,
},)

// Hash password before saving to database
UserSchema.pre("save", async function (next){
  if (!this.isModified("password")) return next()
    try {
      const salt = await bcrypt.genSalt(12)
      this.password = await bcrypt.hash(this.password as string, salt)
      next()
    } catch (error) {
      next(error as Error)
    }

} )



UserSchema.methods.comparePassword = async function (candidatePassword: string) {
  return await bcrypt.compare(candidatePassword, this.password)
}

// Delete the model if it exists to prevent OverwriteModelError during hot reloads
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema)

export default User
