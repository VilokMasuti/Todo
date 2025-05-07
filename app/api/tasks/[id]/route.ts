import { getCurrentUser, isManagerOrAdmin } from '@/lib/auth';
import Notification from '@/lib/models/notification.model';
import Task from '@/lib/models/task.model';
import dbConnect from '@/lib/mongoose';
import mongoose from 'mongoose';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid task id' }, { status: 400 });
    }
    await dbConnect(); // Connect to the database
    // Find the task by id

    // Get task with user details
    const task = await Task.findById(id)
      .populate('createdBy', 'name')
      .populate('assignedTo', 'name');

    if (!task) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }

    //check if the user is the creator or assigned to the task
    if (
      user.role === 'user' &&
      task.createdBy._id.toString() !== user.id &&
      task.assignedTo._id.toString() !== user.id
    ) {
      return NextResponse.json({ message: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const id = params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid task id' }, { status: 400 });
    }
    const { title, description, dueDate, priority, status, assignedTo } =
      await request.json();

    //validate the request body
    if (
      !title ||
      !description ||
      !dueDate ||
      !priority ||
      !status ||
      !assignedTo
    ) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    await dbConnect(); // Connect to the database

    //get current task to check if the user is the creator or assigned to the task
    const currentTask = await Task.findById(id);
    if (!currentTask) {
      return NextResponse.json({ message: 'Task not found' }, { status: 404 });
    }
    // Check if user has permission to update
    const isManagerOrAdminUser = await isManagerOrAdmin();
    if (
      !isManagerOrAdminUser &&
      currentTask.createdBy.toString() !== user.id &&
      currentTask.assignedTo.toString() !== user.id
    ) {
      return NextResponse.json(
        { message: 'Permission denied' },
        { status: 403 }
      );
    }
    // If user is assigned to the task but didn't create it, they can only update status

    if (
      !isManagerOrAdminUser &&
      currentTask.createdBy.toString() !== user.id &&
      currentTask.assignedTo.toString() === user.id
    ) {
      // Only allow status update
      currentTask.status = status;
      await currentTask.save();
      // Create notification if status changed to completed
      // Create notification if status changed to completed
      if (status === 'completed' && currentTask.status !== 'completed') {
        const notification = new Notification({
          userId: currentTask.createdBy.toString(),
          message: `Task "${currentTask.title}" has been marked as completed`,
          type: 'task_completed',
          read: false,
          taskId: currentTask._id,
        });

        await notification.save();
      }

      return NextResponse.json(
        { message: 'Task status updated successfully' },
        { status: 200 }
      );
    }
    // Full update for creators, managers, and admins
    currentTask.title = title;
    currentTask.description = description;
    currentTask.dueDate = new Date(dueDate);
    currentTask.priority = priority;
    currentTask.status = status;
    currentTask.assignedTo = assignedTo;

    await currentTask.save();

    // Create notification if assignee changed
    if (
      assignedTo !== currentTask.assignedTo.toString() &&
      assignedTo !== user.id
    ) {
      const notification = new Notification({
        userId: assignedTo,
        message: `You have been assigned to task: ${title}`,
        type: 'task_assigned',
        read: false,
        taskId: currentTask._id,
      });

      await notification.save();
    }
    // Create notification if status changed to completed
    if (status === 'completed' && currentTask.status !== 'completed') {
      const notification = new Notification({
        userId: currentTask.createdBy.toString(),
        message: `Task "${title}" has been marked as completed`,
        type: 'task_completed',
        read: false,
        taskId: currentTask._id,
      });

      await notification.save();
    }

    return NextResponse.json(
      { message: 'Task updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const id = params.id
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid task ID" }, { status: 400 })
    }

    await dbConnect()

    // Check if task exists
    const task = await Task.findById(id)
    if (!task) {
      return NextResponse.json({ message: "Task not found" }, { status: 404 })
    }

    // Check if user has permission to delete
    const isManagerOrAdminUser = await isManagerOrAdmin()
    if (!isManagerOrAdminUser && task.createdBy.toString() !== user.id) {
      return NextResponse.json({ message: "Permission denied" }, { status: 403 })
    }

    // Delete task
    await Task.findByIdAndDelete(id)

    // Delete related notifications
    await Notification.deleteMany({ taskId: id })

    return NextResponse.json({ message: "Task deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Delete task error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
