/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUser } from '@/lib/auth';
import Notification from '@/lib/models/notification.model';
import Task from '@/lib/models/task.model';
import dbConnect from '@/lib/mongoose';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // //  Read filters from the URL
    // This checks the link for filters like: http://localhost:3000/api/tasks?status=completed&priority=high
    // // and extracts the values of the filters

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assignedTo = searchParams.get('assignedTo');
    const createdBy = searchParams.get('createdBy');
    const search = searchParams.get('search');
    await dbConnect();

    // Start with an empty box of filters. We will add to it.
    const query: any = {};
    // Role-Based Access Control (RBAC) - check if the user is an admin or not
    if (user.role === 'user') {
      // If the user is a normal user, we only show tasks assigned to them to or created.
      query.$or = [{ assignedTo: user.id }, { createdBy: user.id }];
    } else if (user.role === 'admin') {
      // If the user is an admin, we show all tasks.
      // No need to add anything to the query.
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (createdBy) query.createdBy = createdBy;

    if (search) {
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }
    // Get tasks with user details
    const tasks = await Task.find(query)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    console.error('Get tasks error:', error);
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

    const { title, description, dueDate, priority, status, assignedTo } =
      await request.json();

    // Validate input
    if (
      !title ||
      !description ||
      !dueDate ||
      !priority ||
      !status ||
      !assignedTo
    ) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Create task
    const task = new Task({
      title,
      description,
      dueDate: new Date(dueDate),
      priority,
      status,
      createdBy: user.id,
      assignedTo,
    });

    await task.save();

    // Create notification for assigned user if it's not the creator
    if (assignedTo !== user.id) {
      const notification = new Notification({
        userId: assignedTo,
        message: `You have been assigned a new task: ${title}`,
        type: 'task_assigned',
        read: false,
        taskId: task._id,
      });

      await notification.save();
    }

    return NextResponse.json(
      { message: 'Task created successfully', taskId: task._id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
