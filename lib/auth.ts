/* eslint-disable @typescript-eslint/no-unused-vars */
import { sign, verify } from "jsonwebtoken"

import { cookies } from "next/headers"
import User from "../lib/models/user.model"

import dbConnect from "@/lib/mongoose"
import { NextRequest } from "next/server"

//This is the secret key used to sign and verify JWTs.//
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// This defines what kind of data will be stored inside the JWT //
export interface UserJwtPayload {
  id: string
  name: string
  email: string
  role: string
}


// This function generates a JWT for a given user. It takes a User object as an argument and returns a signed JWT string. //
export function generateToken(payload:UserJwtPayload){
  return sign(payload,JWT_SECRET,{expiresIn:"7d"})
}

// This function verifies a JWT and returns the decoded payload. It takes a JWT string as an argument and returns the decoded payload or null if verification fails. //
export function verifyToken(token:string){
  try {
    return verify(token,JWT_SECRET) as UserJwtPayload
  } catch (error) {
    return null
  }
}

// This function sets a JWT in the cookies. It takes a JWT string as an argument and sets it in the cookies with the HttpOnly and Secure flags.
// Stores the token inside a cookie named "auth_token".

// httpOnly: Can't be accessed by JavaScript → safer.

// secure: Uses HTTPS only in production.

// maxAge: Lasts 7 days.

// sameSite: Prevents CSRF attacks.

//  //
export async function setAuthCookie(token:string){
  (await cookies()).set({
  name: "auth_token",
  value: token,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  sameSite: "strict",
})

}

// Reads the value of the auth_token cookie//
export async function getAuthCookie() {
  return (await cookies()).get("auth_token")?.value
}

// Deletes the auth_token cookie//
export async function removeAuthCookie() {
  (await cookies()).delete("auth_token")
}

// This function retrieves the currently logged-in user based on the auth_token cookie.
// It connects to the database, verifies the token, and fetches the user details from the database. It returns the user object or null if not found.

export async function getCurrentUser(req?: NextRequest){
  try {
    const token = req ? req.cookies.get("auth_token")?.value : await getAuthCookie()
    if (!token) return null
    const decoded = verifyToken(token)
    if (!decoded) return null
    await dbConnect()
    const user = await User.findById(decoded.id).select("-password") as { _id: string; name: string; email: string; role: string } | null
    if (!user) return null
    return{
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }
  } catch (error) {
    console.error("Get current user error:", error)
    return null
  }


}


// This function checks if the current user is an admin or manager. It retrieves the current user using getCurrentUser() and checks their role. It returns true if the user is an admin or manager, otherwise false.

export async function isAdmin(req?: NextRequest) {
  const user = await getCurrentUser(req)
  return user?.role === "admin"
}

export async function isManagerOrAdmin(req?: NextRequest) {
  const user = await getCurrentUser(req)
  return user?.role === "admin" || user?.role === "manager"
}
