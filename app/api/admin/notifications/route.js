import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import Notification from "@/models/Notification";

export async function GET(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  await connectDB();
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") || "20");
  const unreadOnly = searchParams.get("unreadOnly") === "true";
  const limit = Math.min(Math.max(limitParam, 1), 100);
  const query = unreadOnly ? { read: false } : {};

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ read: false })
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request) {
  const admin = await requireAdmin(request);
  if (!admin.ok) return NextResponse.json({ error: admin.message }, { status: admin.status });

  const { id, markAllRead } = await request.json();
  await connectDB();

  if (markAllRead) {
    await Notification.updateMany({ read: false }, { $set: { read: true } });
    return NextResponse.json({ success: true });
  }

  if (!id) {
    return NextResponse.json({ error: "Notification id is required" }, { status: 400 });
  }

  const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });
  return NextResponse.json({ success: true, notification });
}
