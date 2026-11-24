import { api } from "../utils/api";

export const chatService = {
  getConversations: () => api.get("/chat/conversations"),
  getMessages: (conversationId, limit = 50) => api.get(`/chat/conversations/${conversationId}/messages?limit=${limit}`),
  sendMessage: (conversationId, message) => api.post(`/chat/conversations/${conversationId}/messages`, { message }),
  markRead: (conversationId) => api.patch(`/chat/conversations/${conversationId}/read`, {}),
};
