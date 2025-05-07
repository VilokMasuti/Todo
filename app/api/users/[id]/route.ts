import { isAdmin } from '@/lib/auth';
import User from '@/lib/models/user.model';
import dbConnect from '@/lib/mongoose';
import { NextResponse } from 'next/server';

// Only admins can delete users
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json(
        { message: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const userId = params.id;

    await dbConnect();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    await User.findByIdAndDelete(userId);

    return NextResponse.json(
      { message: 'User deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
