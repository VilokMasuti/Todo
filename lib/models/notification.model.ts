import mongoose, { type Document, type Model, Schema } from "mongoose"

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId
  message: string
  type: "task_assigned" | "task_updated" | "task_completed" | "task_comment"
  read: boolean
  taskId: mongoose.Types.ObjectId
  createdAt: Date
}

const NotificationSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["task_assigned", "task_updated", "task_completed", "task_comment"],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for better query performance
NotificationSchema.index({ userId: 1 })
NotificationSchema.index({ read: 1 })
NotificationSchema.index({ createdAt: -1 })

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema)

export default Notification
