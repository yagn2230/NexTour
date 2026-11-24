const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const BookingPayment = require("../models/BookingPayment");
const ChatConversation = require("../models/ChatConversation");
const ChatMessage = require("../models/ChatMessage");
const User = require("../models/userSchme");
const { sendConversationMessage } = require("../controllers/chatController");

const invoke = (handler, req) => new Promise((resolve, reject) => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      resolve(this);
      return this;
    },
  };
  handler(req, response, reject);
});

test("accepted booking participants can exchange private messages", async () => {
  const originals = {
    startSession: mongoose.startSession,
    conversationFindOne: ChatConversation.findOne,
    bookingFindOne: BookingPayment.findOne,
    messageCreate: ChatMessage.create,
    conversationUpdateOne: ChatConversation.updateOne,
    userUpdateOne: User.updateOne,
  };
  const conversationId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  const organizerId = new mongoose.Types.ObjectId();
  const travelerId = new mongoose.Types.ObjectId();
  const conversation = {
    _id: conversationId,
    trip: tripId,
    organizer: organizerId,
    traveler: travelerId,
    status: "Active",
  };
  let createdMessage;
  let notification;
  try {
    mongoose.startSession = async () => ({
      withTransaction: async (operation) => operation(),
      endSession: async () => {},
    });
    ChatConversation.findOne = async (filter) => {
      assert.ok(filter.$or.some((entry) => entry.organizer?.toString() === travelerId.toString()));
      return conversation;
    };
    BookingPayment.findOne = () => ({
      select: async () => ({ _id: new mongoose.Types.ObjectId() }),
    });
    ChatMessage.create = async (documents) => {
      createdMessage = { _id: new mongoose.Types.ObjectId(), ...documents[0] };
      return [createdMessage];
    };
    ChatConversation.updateOne = async () => ({ matchedCount: 1, modifiedCount: 1 });
    User.updateOne = async (filter, update) => {
      notification = { filter, update };
      return { matchedCount: 1 };
    };

    const response = await invoke(sendConversationMessage, {
      authUser: { id: travelerId.toString(), role: "User" },
      params: { conversationId: conversationId.toString() },
      body: { message: "  See you at the station.  " },
    });
    assert.equal(response.statusCode, 201);
    assert.equal(createdMessage.sender.toString(), travelerId.toString());
    assert.equal(createdMessage.receiver.toString(), organizerId.toString());
    assert.equal(createdMessage.message, "See you at the station.");
    assert.equal(notification.filter._id.toString(), organizerId.toString());
    assert.equal(notification.update.$push.notifications.$each[0].type, "chat-message");
  } finally {
    mongoose.startSession = originals.startSession;
    ChatConversation.findOne = originals.conversationFindOne;
    BookingPayment.findOne = originals.bookingFindOne;
    ChatMessage.create = originals.messageCreate;
    ChatConversation.updateOne = originals.conversationUpdateOne;
    User.updateOne = originals.userUpdateOne;
  }
});

test("users without an active accepted booking cannot send chat messages", async () => {
  const originalConversationFindOne = ChatConversation.findOne;
  const originalBookingFindOne = BookingPayment.findOne;
  const conversationId = new mongoose.Types.ObjectId();
  const userId = new mongoose.Types.ObjectId();
  try {
    ChatConversation.findOne = async () => ({
      _id: conversationId,
      trip: new mongoose.Types.ObjectId(),
      organizer: new mongoose.Types.ObjectId(),
      traveler: userId,
      status: "Active",
    });
    BookingPayment.findOne = () => ({ select: async () => null });
    const response = await invoke(sendConversationMessage, {
      authUser: { id: userId.toString(), role: "User" },
      params: { conversationId: conversationId.toString() },
      body: { message: "This should not be sent." },
    });
    assert.equal(response.statusCode, 404);
  } finally {
    ChatConversation.findOne = originalConversationFindOne;
    BookingPayment.findOne = originalBookingFindOne;
  }
});

test("Admin chat access is read-only", async () => {
  const response = await invoke(sendConversationMessage, {
    authUser: { id: new mongoose.Types.ObjectId().toString(), role: "Admin" },
    params: { conversationId: new mongoose.Types.ObjectId().toString() },
    body: { message: "Admin cannot send this message." },
  });
  assert.equal(response.statusCode, 403);
});
