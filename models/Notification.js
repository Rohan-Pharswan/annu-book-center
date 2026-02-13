import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    type: { type: String, default: "system" },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    meta: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true }
  },
  { timestamps: true }
);

const Notification = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
export default Notification;
