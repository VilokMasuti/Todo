/* eslint-disable @typescript-eslint/no-unused-vars */
import { getCurrentUser } from '@/lib/auth';
import Notification from '@/lib/models/notification.model';
import dbConnect from '@/lib/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();

    // Get user's notifications
    const notifications = await Notification.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .populate('taskId', 'title');
    return NextResponse.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { notificationId } = await request.json();
    if (!notificationId || !Array.isArray(notificationId)) {
      return NextResponse.json(
        { message: 'Invalid notification IDs' },
        { status: 400 }
      );
    }
    await dbConnect();
    // Mark notifications as read
    await Notification.updateMany(
      { _id: { $in: notificationId } },
      { $set: { isRead: true } }
    );
    return NextResponse.json(
      { message: 'Notifications marked as read' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
