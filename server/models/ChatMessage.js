const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "ChatConversation", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, trim: true, required: true, maxlength: 2000 },
    sentAt: { type: Date, default: Date.now, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

chatMessageSchema.index({ conversation: 1, sentAt: -1 });
chatMessageSchema.index({ conversation: 1, receiver: 1, readAt: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
