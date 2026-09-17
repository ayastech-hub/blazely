// src/components/AIChatSupport.jsx
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  X,
  Send,
  Globe,
  Twitter,
  MessageCircle,
  Copy,
  Terminal,
} from "lucide-react";
import axios from "axios";

// --- Sub-component for isolated structured token feedback ---
const TokenDetailCard = ({ lines }) => {
  return (
    <div className="space-y-2 font-mono text-[11px] tracking-wide">
      {lines.map((line, i) => {
        if (line.startsWith("Token ")) {
          return (
            <div key={i} className="text-xs font-black text-[var(--text-bright-2)] border-b border-[var(--border)] pb-1 uppercase tracking-widest">
              {line.replace("Token ", "")}
            </div>
          );
        }
        if (line.startsWith("Price:") || line.startsWith("Market Cap:") || line.startsWith("Volume")) {
          return (
            <div key={i} className="text-[var(--text-mid)] flex items-center justify-between bg-[var(--bg)]/50 px-2 py-1 rounded border border-[var(--border)]/40">
              <span className="text-[var(--text-faint-2)] font-bold uppercase text-[9px]">{line.split(":")[0]}:</span>
              <span className="font-bold">{line.split(":")[1]?.trim()}</span>
            </div>
          );
        }
        if (line.startsWith("Creator:")) {
          const address = line.replace("Creator: ", "").trim();
          return (
            <div key={i} className="flex items-center justify-between gap-2 text-[var(--text-faint-2)] bg-[var(--bg)]/30 px-2 py-1 rounded border border-[var(--border)]/20 text-[10px]">
              <span className="truncate max-w-[140px]">ADDR: {address}</span>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(address)}
                style={{ color: 'var(--teal)' }}
                className="flex items-center gap-1 font-bold hover:opacity-80 transition-opacity"
              >
                <Copy size={10} /> COPY
              </button>
            </div>
          );
        }
        if (line.startsWith("Website:") || line.startsWith("Twitter:") || line.startsWith("Telegram:")) {
          const parts = line.split(": ");
          const label = parts[0];
          const url = parts.slice(1).join(": ");
          const Icon = label.startsWith("Website") ? Globe : label.startsWith("Twitter") ? Twitter : MessageCircle;
          
          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[var(--text-mid-2)] hover:text-[var(--text-bright-2)] transition-colors bg-[var(--bg)]/20 px-2 py-1 border border-[var(--border)]/10 rounded"
            >
              <Icon size={11} className="text-[var(--border-mid)]" />
              <span className="uppercase text-[9px]">{label}:</span>
              <span className="truncate flex-1 text-right text-[var(--text-faint-2)] underline">{url}</span>
            </a>
          );
        }
        return <div key={i} className="text-[var(--text-mid-2)] pl-1">{line}</div>;
      })}
    </div>
  );
};

// --- Chat item component ---
const ChatMessage = ({ message, isUser }) => {
  const isTokenInfo = message.includes("Token ") && message.includes("Creator:");

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.15 }}
      className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        style={{ 
          borderColor: isUser ? 'var(--teal)20' : '',
          backgroundColor: isUser ? 'var(--teal)08' : 'var(--bg-alt)/40'
        }}
        className={`max-w-[85%] rounded p-3 border shadow-sm text-xs ${
          isUser
            ? "border-[var(--border-hi)] text-[var(--text-bright-2)]"
            : "bg-[var(--bg-alt)]/40 border-[var(--border)] text-[var(--text-mid)]"
        }`}
      >
        {isTokenInfo ? (
          <TokenDetailCard lines={message.split("\n")} />
        ) : (
          <div className="whitespace-pre-wrap font-mono tracking-wide leading-relaxed break-words">{message}</div>
        )}
      </div>
    </motion.div>
  );
};

// --- Container Component ---
export default function AIChatSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "SYSTEM TERMINAL ACTIVE.\nAsk me about verified index metrics, creators, or protocol addresses.",
      isUser: false,
    },
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      text: "PROCESSING COMMAND SEQUENCE...",
      isUser: false,
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingIndicator]);

    try {
      const res = await axios.post("http://localhost:4000/api/ai-chat", {
        message: userMessage,
      });
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isTyping);
        return [
          ...filtered,
          { id: Date.now() + 2, text: res.data.reply, isUser: false },
        ];
      });
    } catch (err) {
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isTyping);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            text: "ERROR: PIPELINE DISCONNECTED.",
            isUser: false,
          },
        ];
      });
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="chatWindow"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-80 sm:w-96 h-[480px] bg-[var(--bg)] rounded border border-[var(--border)] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Window Top Navigation Bar */}
            <div className="flex items-center justify-between p-3 bg-[var(--bg-alt)]/60 border-b border-[var(--border)]">
              <h3 className="text-[var(--text-bright-2)] font-mono text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Terminal size={12} style={{ color: 'var(--teal)' }} /> 
                SYSTEM_AI MODULE
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-[var(--text-faint-2)] hover:text-[var(--text-bright-2)] hover:bg-[var(--bg-alt)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Core Messages Canvas Feed */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-none bg-[var(--bg)]/30">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg.text}
                  isUser={msg.isUser}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Data Pipeline User Submission Node */}
            <form
              onSubmit={handleSend}
              className="p-2 border-t border-[var(--border)] bg-[var(--bg-alt)]/40 flex gap-1.5"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ENTER SEARCH PARAMS / CMD..."
                className="flex-1 px-3 py-2 bg-[var(--input-bg)] text-xs font-mono text-[var(--input-text)] placeholder-[var(--input-placeholder)] border border-[var(--input-border)] rounded focus:border-[var(--input-border-focus)] focus:outline-none transition-colors uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                style={{
                  backgroundColor: input.trim() ? 'var(--teal)' : '',
                  color: input.trim() ? 'var(--bg)' : ''
                }}
                className={`p-2 rounded border transition-all flex items-center justify-center flex-shrink-0 ${
                  input.trim()
                    ? "border-transparent opacity-100 hover:opacity-90 active:scale-95"
                    : "bg-[var(--panel-alt)]/40 border-[var(--border)] text-[var(--border-mid)] cursor-not-allowed"
                }`}
              >
                <Send size={12} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Infrastructure Toggle Anchor Button */}
      <motion.button
        key="chatToggle"
        onClick={() => setIsOpen(!isOpen)}
        whileTap={{ scale: 0.97 }}
        style={{ borderColor: isOpen ? 'var(--teal)40' : '' }}
        className={`w-11 h-11 rounded border flex items-center justify-center shadow-xl transition-all ${
          isOpen
            ? "bg-[var(--bg-alt)] text-[var(--text-bright-2)] border-[var(--border-hi)]"
            : "bg-[var(--bg)] border-[var(--border)] text-[var(--text-mid-2)] hover:text-[var(--text-bright)] hover:bg-[var(--bg-alt)]"
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="closeIcon"
              initial={{ rotate: -45, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 45, opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <X size={16} style={{ color: 'var(--teal)' }} />
            </motion.div>
          ) : (
            <motion.div
              key="openIcon"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <MessageSquare size={16} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
