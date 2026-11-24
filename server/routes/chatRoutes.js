const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  getConversations,
  getConversationMessages,
  sendConversationMessage,
  markConversationRead,
} = require("../controllers/chatController");

const router = express.Router();

router.use(authMiddleware);
router.get("/conversations", getConversations);
router.get("/conversations/:conversationId/messages", getConversationMessages);
router.post("/conversations/:conversationId/messages", sendConversationMessage);
router.patch("/conversations/:conversationId/read", markConversationRead);

module.exports = router;
