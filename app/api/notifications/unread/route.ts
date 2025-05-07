import { NextResponse } from "next/server"
import dbConnect from "@/lib/mongoose"

import { getCurrentUser } from "@/lib/auth"
import Notification from "@/lib/models/notification.model"

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    // Count unread notifications
    const count = await Notification.countDocuments({ userId: user.id, read: false })

    return NextResponse.json({ count }, { status: 200 })
  } catch (error) {
    console.error("Get unread notifications count error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
