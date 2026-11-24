const mongoose = require("mongoose");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/userSchme");
const { asyncHandler } = require("../middleware/errorMiddleware");
const withTransaction = require("../services/withTransaction");

const conversationPopulate = [
  { path: "trip", select: "title destination startDate endDate coverImage" },
  { path: "organizer", select: "fullName username profileImage" },
  { path: "traveler", select: "fullName username profileImage" },
];

const findAccessibleConversation = async (conversationId, userId, isAdmin, requireActive = true) => {
  const filter = { _id: conversationId };
  if (requireActive) filter.status = "Active";
  if (!isAdmin) {
    filter.$or = [{ organizer: userId }, { traveler: userId }];
  }
  const conversation = await ChatConversation.findOne(filter);
  if (!conversation) return null;
  if (!isAdmin) {
    const booking = await BookingPayment.findOne({
      trip: conversation.trip,
      traveler: conversation.traveler,
      bookingStatus: { $in: ["Accepted", "Confirmed"] },
      paymentStatus: { $in: ["Pending", "Cash Payment Pending", "Paid", "Not Required"] },
    }).select("_id");
    if (!booking) return null;
  }
  return conversation;
};

const getConversations = asyncHandler(async (req, res) => {
  const isAdmin = req.authUser?.role === "Admin";
  const filter = isAdmin
    ? {}
    : {
      status: "Active",
      $or: [{ organizer: req.authUser.id }, { traveler: req.authUser.id }],
    };
  const conversations = await ChatConversation.find(filter)
    .populate(conversationPopulate)
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(200)
    .lean();
  const unreadCounts = await ChatMessage.aggregate([
    {
      $match: {
        conversation: { $in: conversations.map((item) => item._id) },
        receiver: new mongoose.Types.ObjectId(req.authUser.id),
        readAt: null,
      },
    },
    { $group: { _id: "$conversation", count: { $sum: 1 } } },
  ]);
  const unreadByConversation = new Map(unreadCounts.map(({ _id, count }) => [_id.toString(), count]));
  res.json({
    success: true,
    count: conversations.length,
    data: conversations.map((conversation) => ({
      ...conversation,
      unreadCount: unreadByConversation.get(conversation._id.toString()) || 0,
    })),
  });
});

const getConversationMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  if (!mongoose.isObjectIdOrHexString(conversationId)) {
    return res.status(400).json({ success: false, message: "Invalid conversation ID." });
  }
  const isAdmin = req.authUser?.role === "Admin";
  const conversation = await findAccessibleConversation(
    conversationId,
    req.authUser.id,
    isAdmin,
    !isAdmin
  );
  if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });

  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
  const filter = { conversation: conversation._id };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (Number.isNaN(before.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid message cursor." });
    }
    filter.sentAt = { $lt: before };
  }
  const messages = await ChatMessage.find(filter)
    .populate("sender", "fullName username profileImage")
    .sort({ sentAt: -1 })
    .limit(limit)
    .lean();
  res.json({
    success: true,
    data: {
      conversation: {
        ...conversation.toObject(),
      },
      messages: messages.reverse(),
    },
  });
});

const sendConversationMessage = asyncHandler(async (req, res) => {
  if (req.authUser?.role === "Admin") {
    return res.status(403).json({ success: false, message: "Admin access is read-only for private trip chats." });
  }
  const { conversationId } = req.params;
  if (!mongoose.isObjectIdOrHexString(conversationId)) {
    return res.status(400).json({ success: false, message: "Invalid conversation ID." });
  }
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 2000) {
    return res.status(400).json({ success: false, message: "Message must contain 1 to 2000 characters." });
  }
  const conversation = await findAccessibleConversation(
    conversationId,
    req.authUser.id,
    false,
    true
  );
  if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
  const senderId = req.authUser.id;
  const receiverId = conversation.organizer.toString() === senderId
    ? conversation.traveler
    : conversation.organizer;
  const sentAt = new Date();
  const sentMessage = await withTransaction(async (session) => {
    const [createdMessage] = await ChatMessage.create([{
      conversation: conversation._id,
      sender: senderId,
      receiver: receiverId,
      message,
      sentAt,
    }], { session });
    const updatedConversation = await ChatConversation.updateOne(
      { _id: conversation._id, status: "Active" },
      {
        $set: {
          lastMessage: message,
          lastMessageAt: sentAt,
          lastMessageSender: senderId,
        },
      },
      { session }
    );
    if (!updatedConversation.matchedCount) {
      throw new Error("The conversation was closed before the message could be sent.");
    }
    await User.updateOne(
      { _id: receiverId },
      {
        $push: {
          notifications: {
            $each: [{
              type: "chat-message",
              title: "New trip message",
              detail: "You received a new private trip message.",
              relatedTrip: conversation.trip,
            }],
            $sort: { createdAt: -1 },
            $slice: 100,
          },
        },
      },
      { session }
    );
    return createdMessage;
  });
  res.status(201).json({ success: true, data: sentMessage });
});

const markConversationRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  if (!mongoose.isObjectIdOrHexString(conversationId)) {
    return res.status(400).json({ success: false, message: "Invalid conversation ID." });
  }
  const conversation = await findAccessibleConversation(conversationId, req.authUser.id, false, true);
  if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
  const result = await ChatMessage.updateMany(
    {
      conversation: conversation._id,
      receiver: req.authUser.id,
      readAt: null,
    },
    { $set: { readAt: new Date() } }
  );
  res.json({ success: true, data: { markedRead: result.modifiedCount } });
});

module.exports = {
  getConversations,
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
};
