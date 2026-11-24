const mongoose = require("mongoose");

const chatConversationSchema = new mongoose.Schema(
  {
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    traveler: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    joinRequest: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["Active", "Disabled"], default: "Active", required: true },
    lastMessage: { type: String, trim: true, maxlength: 2000, default: "" },
    lastMessageAt: { type: Date, default: null },
    lastMessageSender: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

chatConversationSchema.index({ trip: 1, traveler: 1 }, { unique: true });
chatConversationSchema.index({ organizer: 1, status: 1, lastMessageAt: -1 });
chatConversationSchema.index({ traveler: 1, status: 1, lastMessageAt: -1 });

module.exports = mongoose.model("ChatConversation", chatConversationSchema);
