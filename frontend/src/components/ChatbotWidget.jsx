import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Send, X, Plane, Compass, HelpCircle, MapPin, CheckCircle } from 'lucide-react';
import LivingStatusBoard from './LivingStatusBoard';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: 'Hi! I am **SkyGuide AI**, your personal airport companion. Ask me about your flight status, security wait times, parking availability, or directions to terminal services!'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Create unique session on mount and listen to global open trigger
  useEffect(() => {
    const sId = 'session_' + Math.random().toString(36).substring(2, 10);
    setSessionId(sId);

    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-skybot', handleOpen);
    return () => window.removeEventListener('open-skybot', handleOpen);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await axios.post('http://127.0.0.1:8000/chatbot/message', {
        message: userMessage,
        session_id: sessionId
      });
      
      const { response, intent, route } = res.data;

      setMessages((prev) => [...prev, { role: 'bot', content: response, route, intent }]);

      if (route) {
        setTimeout(() => {
          navigate(route);
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: "I couldn't reach the airport servers. Please verify your connection and try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const parseMarkdown = (text) => {
    if (!text) return '';
    let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline font-semibold">$1</a>');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans flex flex-col items-end">
      {/* Floating Action Button (FAB) / Radar Avatar */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full border border-cyan-500/30 flex items-center justify-center text-white cursor-pointer relative shadow-lg transition-transform hover:scale-105"
          style={{ 
            background: 'linear-gradient(135deg, #0B1E33 0%, #16807F 100%)',
            boxShadow: '0 8px 24px rgba(22, 128, 127, 0.4)' 
          }}
        >
          {/* Radar Sweep Ring */}
          <div className="absolute inset-2 rounded-full border border-cyan-400/20 radar-sweep-anim" />
          {/* Pulsing rings */}
          <div className="absolute inset-0 rounded-full border border-cyan-400/10 pulse-ring-anim" />
          <Plane className="w-6 h-6 text-white transform -rotate-45" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div 
          className="w-96 h-[500px] glass-card flex flex-col overflow-hidden transition-all duration-200 transform origin-bottom-right scale-100 opacity-100"
          style={{
            borderColor: 'rgba(22, 128, 127, 0.3)',
            boxShadow: '0 12px 40px rgba(11, 30, 83, 0.4)',
            borderRadius: '12px'
          }}
        >
          {/* Header */}
          <div 
            className="p-4 flex items-center justify-between bg-slate-950/95"
            style={{
              borderBottom: '1px solid rgba(22, 128, 127, 0.2)'
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#0B1E33] flex items-center justify-center border border-cyan-500/30 relative">
                <div className={`absolute inset-1 rounded-full border border-cyan-400/30 ${loading ? 'radar-sweep-anim-fast pulse-ring-anim' : 'radar-sweep-anim'}`} />
                <Plane className="w-4 h-4 text-[#16807F] transform -rotate-45 relative z-10" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-100 text-sm">SkyGuide AI</h4>
                <p className="text-[10px] text-cyan-400 font-mono">Your airport companion</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-100 cursor-pointer transition-colors bg-transparent border-none focus-ring rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] p-3.5 text-[13px] leading-relaxed relative ${
                    msg.role === 'user' 
                      ? 'bg-blue-900/90 text-white rounded-2xl rounded-br-none font-medium' 
                      : 'bg-[#2B2F36] text-slate-100 rounded-2xl rounded-bl-none ticket-stub pl-6 shadow-sm border border-slate-700/30'
                  }`}
                  style={{
                    backgroundColor: msg.role === 'user' ? '#16807F' : '#2B2F36'
                  }}
                >
                  {parseMarkdown(msg.content)}
                  
                  {msg.route && (
                    <div className="mt-2.5 text-[10px] text-cyan-300 italic flex items-center gap-1 font-mono">
                      <CheckCircle className="w-3.5 h-3.5" /> Redirecting to {msg.route}...
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#2B2F36] border border-slate-700/30 rounded-2xl rounded-bl-none p-4 flex items-center gap-1.5 ticket-stub pl-6">
                  {/* Sequence of 3 radar blip dots */}
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '0.3s' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" style={{ animationDelay: '0.6s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-900 bg-slate-950 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask SkyGuide..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs px-3.5 py-2.5 outline-none focus:border-cyan-500 font-sans focus-ring"
              style={{ background: 'rgba(15, 23, 42, 0.8)' }}
            />
            <button
              type="submit"
              className="w-10 h-10 bg-cyan-800 hover:bg-cyan-700 text-white rounded-lg flex items-center justify-center cursor-pointer border-none focus-ring"
              style={{ backgroundColor: '#16807F' }}
            >
              <Send className="w-4 h-4 text-slate-900" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
