import User from "@/lib/models/user.model"
import dbConnect from "@/lib/mongoose"
import { NextResponse } from "next/server"


export async function POST(request: Request) {
try {
  const {email,password,name} = await request.json()
  //validate the data
  if (!email || !password || !name) {
    return new Response(JSON.stringify({message:"All fields are required"}),{status:400})
  }
  //check if the user already exists
  await dbConnect()

  const existingUser  = await User.findOne({email})
  if (existingUser) {
    return new Response(JSON.stringify({message:"User already exists"}),{status:400})
  }
    // Create user - password hashing is handled by the model pre-save hook
  const user = new User({
    name,
    email,
    password,
    role:"user", // default role

  })
  await user.save()
  return NextResponse.json({ message: "User registered successfully", userId: user._id }, { status: 201 })
} catch (error) {
  console.error("Registration error:", error)
  return NextResponse.json({ message: "Internal server error" }, { status: 500 })
}
}


