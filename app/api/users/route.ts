/* eslint-disable @typescript-eslint/no-unused-vars */
import { getCurrentUser, isAdmin } from '@/lib/auth';
import User from '@/lib/models/user.model';
import dbConnect from '@/lib/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    await dbConnect();
    // Get all users without passwords
    const users = await User.find({}).select('-password');
    return NextResponse.json({ users }, { status: 200 });

    // Only admins can update user roles
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Only admins can update user roles
export async function PUT(request: Request) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    const { userId, role } = await request.json();
    if (!userId || !role) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }
    await dbConnect();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    user.role = role;
    await user.save();

    return NextResponse.json(
      { message: 'User role updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
