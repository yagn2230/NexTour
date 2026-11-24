import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiMessageCircle, FiSend } from "react-icons/fi";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { chatService } from "../services/chatService";

const userIdOf = (value) => value?._id?.toString() || value?.id?.toString() || value?.toString() || "";

const timeLabel = (value) => value
  ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  : "";

const otherParticipant = (conversation, userId) => (
  userIdOf(conversation.organizer) === userId
    ? conversation.traveler
    : conversation.organizer
);

export default function ChatPage({ embedded = false }) {
  const { conversationId: routeConversationId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const currentUserId = userIdOf(user);
  const [embeddedConversationId, setEmbeddedConversationId] = useState("");
  const conversationId = embedded ? embeddedConversationId : routeConversationId;
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [conversationDetail, setConversationDetail] = useState(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let active = true;
    const loadConversations = async () => {
      try {
        const response = await chatService.getConversations();
        if (active) {
          setConversations(response.data || []);
          setError("");
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load conversations.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadConversations();
    const intervalId = window.setInterval(loadConversations, 10000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!conversationId) return undefined;
    let active = true;
    const loadMessages = async () => {
      setMessagesLoading(true);
      try {
        const response = await chatService.getMessages(conversationId);
        if (!active) return;
        setConversationDetail(response.data?.conversation || null);
        setMessages(response.data?.messages || []);
        setError("");
        if (!isAdmin) {
          await chatService.markRead(conversationId);
        }
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load this conversation.");
      } finally {
        if (active) setMessagesLoading(false);
      }
    };
    loadMessages();
    const intervalId = window.setInterval(loadMessages, 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [conversationId, isAdmin, refreshKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedConversation = conversations.find((item) => userIdOf(item._id) === conversationId);
  const matchingDetail = userIdOf(conversationDetail?._id) === conversationId
    ? conversationDetail
    : null;
  const activeConversation = selectedConversation || matchingDetail;
  const peer = activeConversation && !isAdmin ? otherParticipant(activeConversation, currentUserId) : null;
  const participantLabel = isAdmin && activeConversation
    ? `${activeConversation.organizer?.fullName || "Organizer"} ↔ ${activeConversation.traveler?.fullName || "Traveler"}`
    : peer?.fullName || peer?.username || "Trip member";
  const visibleMessages = matchingDetail ? messages : [];
  const canSend = Boolean(
    !isAdmin
    && activeConversation?.status === "Active"
    && (
      userIdOf(activeConversation.organizer) === currentUserId
      || userIdOf(activeConversation.traveler) === currentUserId
    )
  );

  const sendMessage = async (event) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message || !conversationId || sending || !canSend) return;
    setSending(true);
    setError("");
    try {
      await chatService.sendMessage(conversationId, message);
      setDraft("");
      setRefreshKey((key) => key + 1);
    } catch (sendError) {
      setError(sendError.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-[#f8faf9]"}>
      {!embedded && <Navbar />}
      <main className={embedded ? "" : "mx-auto max-w-7xl px-4 py-6 sm:px-7 lg:px-8"}>
        {!embedded && <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Private trip chat</p>
            <h1 className="mt-1 text-3xl font-black text-slate-900">Messages</h1>
          </div>
          {!isAdmin && <Link to="/bookings" className="text-sm font-bold text-teal-800 hover:underline">My bookings</Link>}
        </header>}

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}

        <section aria-label={embedded ? "Trip chats" : "Private trip chats"} className="grid min-h-[65vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`${conversationId ? "hidden md:block" : "block"} border-b border-slate-200 md:border-b-0 md:border-r`}>
            <div className="border-b border-slate-100 px-4 py-4">
              <h2 className="font-black text-slate-900">{isAdmin ? "All conversations" : "Your conversations"}</h2>
              <p className="mt-1 text-xs text-slate-500">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</p>
            </div>
            {loading ? (
              <p role="status" className="p-5 text-sm text-slate-500">Loading conversations…</p>
            ) : conversations.length ? (
              <ul className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto">
                {conversations.map((conversation) => {
                  const other = otherParticipant(conversation, currentUserId);
                  const conversationParticipantLabel = isAdmin
                    ? `${conversation.organizer?.fullName || "Organizer"} ↔ ${conversation.traveler?.fullName || "Traveler"}`
                    : other?.fullName || other?.username || "Trip member";
                  const isSelected = userIdOf(conversation._id) === conversationId;
                  return (
                    <li key={conversation._id}>
                      {embedded ? (
                        <button type="button" onClick={() => setEmbeddedConversationId(conversation._id)} aria-current={isSelected ? "true" : undefined} className={`block w-full px-4 py-4 text-left transition hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}>
                          <div className="flex items-start justify-between gap-2">
                            <span className="truncate text-sm font-bold text-slate-900">{conversation.trip?.title || "Trip conversation"}</span>
                            {conversation.unreadCount > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-teal-800 px-1 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-600">{conversationParticipantLabel}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage || "Start a private conversation"}</p>
                          {conversation.status === "Disabled" && <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Closed</span>}
                        </button>
                      ) : (
                        <Link to={`/chats/${conversation._id}`} className={`block px-4 py-4 transition hover:bg-teal-50 ${isSelected ? "bg-teal-50" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-sm font-bold text-slate-900">{conversation.trip?.title || "Trip conversation"}</span>
                          {conversation.unreadCount > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-teal-800 px-1 text-[10px] font-bold text-white">{conversation.unreadCount}</span>}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-600">{conversationParticipantLabel}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{conversation.lastMessage || "Start a private conversation"}</p>
                        {conversation.status === "Disabled" && <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Closed</span>}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6 text-center">
                <FiMessageCircle className="mx-auto text-2xl text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-800">No conversations yet</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">A private chat opens when a trip organizer accepts a traveler.</p>
                {!isAdmin && <Link to="/bookings" className="mt-3 inline-block text-xs font-bold text-teal-800 hover:underline">View bookings</Link>}
              </div>
            )}
          </aside>

          <section className={`${conversationId ? "flex" : embedded ? "flex" : "hidden md:flex"} min-h-[65vh] flex-col`}>
            {activeConversation ? (
              <>
                <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
                  <button type="button" onClick={() => embedded ? setEmbeddedConversationId("") : navigate("/chats")} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Back to conversations"><FiArrowLeft /></button>
                  {peer?.profileImage
                    ? <img src={peer.profileImage} alt="" className="h-10 w-10 rounded-full object-cover" />
                    : <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-full bg-teal-50 font-bold text-teal-800">{(peer?.fullName || peer?.username || "T").slice(0, 1).toUpperCase()}</span>}
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-slate-900">{activeConversation.trip?.title || "Trip conversation"}</h2>
                  <p className="truncate text-xs text-slate-500">{participantLabel} · {activeConversation.status}</p>
                  </div>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 px-4 py-5 sm:px-6">
                  {messagesLoading && !visibleMessages.length && <p role="status" className="text-center text-sm text-slate-500">Loading messages…</p>}
                  {visibleMessages.map((item) => {
                    const mine = userIdOf(item.sender) === currentUserId;
                    return (
                      <div key={item._id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <article className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${mine ? "rounded-br-md bg-teal-800 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800"}`}>
                          {!mine && <p className="mb-1 text-[10px] font-bold opacity-70">{item.sender?.fullName || item.sender?.username || "Trip member"}</p>}
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.message}</p>
                          <time className={`mt-1 block text-right text-[10px] ${mine ? "text-teal-100" : "text-slate-400"}`}>{timeLabel(item.sentAt)}</time>
                        </article>
                      </div>
                    );
                  })}
                  {!visibleMessages.length && !messagesLoading && <p className="py-12 text-center text-sm text-slate-500">No messages yet. Say hello to your trip partner.</p>}
                  <div ref={messagesEndRef} />
                </div>
                {canSend ? (
                  <form onSubmit={sendMessage} className="flex items-end gap-2 border-t border-slate-100 p-3 sm:p-4">
                    <label className="sr-only" htmlFor="chat-message">Message</label>
                    <textarea id="chat-message" maxLength={2000} rows={2} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }} placeholder="Write a message…" className="max-h-32 min-h-12 flex-1 resize-y rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-teal-700" />
                    <button type="submit" disabled={!draft.trim() || sending} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-50" aria-label="Send message"><FiSend /></button>
                  </form>
                ) : (
                  <p className="border-t border-slate-100 bg-slate-50 px-4 py-4 text-center text-xs text-slate-500">
                    {isAdmin ? "Admin access is read-only. Only the organizer and accepted traveler can message." : "This conversation is closed because the booking is no longer active."}
                  </p>
                )}
              </>
            ) : (
              <div className={`${embedded ? "flex" : "hidden md:flex"} flex-1 flex-col items-center justify-center p-8 text-center`}>
                <FiMessageCircle className="text-4xl text-teal-700/40" />
                <h2 className="mt-4 text-lg font-black text-slate-900">Choose a conversation</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Select a trip conversation to read messages and coordinate with the organizer or traveler.</p>
                {embedded && <Link to="/chats" className="mt-3 text-sm font-bold text-teal-800 hover:underline">Open full chat page</Link>}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
