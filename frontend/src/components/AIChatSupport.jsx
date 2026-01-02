import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  User,
  Bot,
  Globe,
  Twitter,
  MessageCircle,
  Copy,
} from "lucide-react";
import axios from "axios";

// Chat bubble component
const ChatMessage = ({ message, isUser }) => {
  const isTokenInfo =
    message.includes("Token ") && message.includes("Creator:");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[90%] rounded-xl p-4 text-sm shadow-md break-words ${
          isUser
            ? "bg-gradient-to-br from-purple-600 to-cyan-500 text-white rounded-br-none"
            : "bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none"
        }`}
      >
        {isTokenInfo ? (
          <div className="space-y-3">
            {message.split("\n").map((line, i) => {
              if (line.startsWith("Token ")) {
                return (
                  <div
                    key={i}
                    className="text-lg font-bold text-white break-words"
                  >
                    {line.replace("Token ", "")}
                  </div>
                );
              }
              if (
                line.startsWith("Price:") ||
                line.startsWith("Market Cap:") ||
                line.startsWith("Volume")
              ) {
                return (
                  <div key={i} className="text-sm text-cyan-300 break-words">
                    {line}
                  </div>
                );
              }
              if (line.startsWith("Creator:")) {
                const address = line.replace("Creator: ", "");
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-slate-400 break-words"
                  >
                    <span>{line}</span>
                    <button
                      className="flex items-center gap-1 text-cyan-400 hover:underline"
                      onClick={() => navigator.clipboard.writeText(address)}
                    >
                      <Copy size={12} /> Copy
                    </button>
                  </div>
                );
              }
              if (
                line.startsWith("Website:") ||
                line.startsWith("Twitter:") ||
                line.startsWith("Telegram:")
              ) {
                const url = line.split(": ")[1];
                const Icon = line.startsWith("Website")
                  ? Globe
                  : line.startsWith("Twitter")
                    ? Twitter
                    : MessageCircle;
                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-200 hover:text-cyan-400 break-words"
                  >
                    <Icon size={14} /> {line.split(":")[0]}
                  </a>
                );
              }
              return (
                <div key={i} className="text-sm break-words">
                  {line}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">{message}</div>
        )}
      </div>
    </motion.div>
  );
};

export default function AIChatSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Welcome! Ask me about tokens, addresses, or socials.",
      isUser: false,
    },
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), text: userMessage, isUser: true },
    ]);
    const typingIndicator = {
      id: Date.now() + 1,
      text: "...",
      isUser: false,
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingIndicator]);

    try {
      const res = await axios.post("http://localhost:4000/api/ai-chat", {
        message: userMessage,
      });
      const aiResponseText = res.data.reply;

      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isTyping);
        return [
          ...filtered,
          { id: Date.now() + 2, text: aiResponseText, isUser: false },
        ];
      });
    } catch (err) {
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isTyping);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            text: "Error: AI not reachable.",
            isUser: false,
          },
        ];
      });
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chatWindow"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-96 h-[520px] bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700/70 backdrop-blur-sm"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
              <h3 className="text-white font-bold text-lg flex items-center">
                <Bot size={20} className="mr-2 text-cyan-400" /> Blazely AI
                Support
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg.text}
                  isUser={msg.isUser}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-slate-700 bg-slate-800 flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about tokens or addresses..."
                className="flex-1 p-3 rounded-full bg-slate-700 text-white placeholder-slate-400 border border-transparent focus:border-cyan-500/50 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-3 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:scale-105 transition-transform"
              >
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        key="chatToggle"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.9 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen
            ? "bg-slate-700 text-white rotate-45"
            : "bg-gradient-to-r from-purple-600 to-cyan-500 text-white hover:scale-110"
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </motion.button>
    </div>
  );
}
