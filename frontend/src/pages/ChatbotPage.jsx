import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Send, User } from 'lucide-react';

// Friendly Customer Service Avatar Component (Section 8a)
function ChatbotAvatar({ isResponding }) {
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg 
        viewBox="0 0 100 100" 
        className={`w-full h-full ${isResponding ? 'animate-avatar-responding' : 'animate-avatar-idle'}`}
      >
        {/* Hair background */}
        <path d="M 30,50 Q 30,20 50,20 Q 70,20 70,50 C 70,60 75,70 75,70 L 25,70 C 25,70 30,60 30,50 Z" fill="#2d3748" />
        
        {/* Head / Face */}
        <circle cx="50" cy="48" r="20" fill="#fbd38d" />
        
        {/* Hair front */}
        <path d="M 30,40 Q 50,30 70,40 C 65,30 55,28 30,40 Z" fill="#2d3748" />
        
        {/* Eyes */}
        <circle cx="43" cy="46" r="2.5" fill="#2d3748" />
        <circle cx="57" cy="46" r="2.5" fill="#2d3748" />
        
        {/* Smile */}
        <path d="M 45,55 Q 50,60 55,55" fill="none" stroke="#2d3748" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Blazer / Coat Collar and Shirt */}
        <path d="M 25,78 C 25,70 32,68 50,68 C 68,68 75,70 75,78 L 70,95 L 30,95 Z" fill="#0B3D66" /> {/* Blazer */}
        <path d="M 42,68 L 50,80 L 58,68 Z" fill="#FFFFFF" /> {/* White Shirt */}
        <path d="M 48,70 L 50,73 L 52,70 Z" fill="#3FA9F5" /> {/* Light Blue Tie/Accent */}

        {/* Headset Band */}
        <path d="M 32,44 A 20,20 0 0,1 68,44" fill="none" stroke="#718096" strokeWidth="3" />

        {/* Headphones (Earpads) */}
        <rect x="27" y="40" width="6" height="12" rx="2" fill="#1a202c" />
        <rect x="67" y="40" width="6" height="12" rx="2" fill="#1a202c" />
        
        {/* Mic boom */}
        <path d="M 30,48 L 40,56 L 42,54" fill="none" stroke="#718096" strokeWidth="2" />
        <circle cx="43" cy="55" r="2.5" fill="#1a202c" />

        {/* Headset LED Glow Indicator (Section 8a) */}
        <circle 
          cx="30" 
          cy="46" 
          r="2.5" 
          fill={isResponding ? "#3FA9F5" : "#34C77B"} 
          className={isResponding ? "animate-led-pulse" : ""}
          style={isResponding ? { filter: 'drop-shadow(0 0 4px #3FA9F5)' } : {}}
        />
      </svg>
    </div>
  );
}

export default function ChatbotPage() {
  const navigate = useNavigate();
  const chatEndRef = useRef(null);

  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello! I am **SkyGuide AI**, your airport helper. I can find your flights, lookup detailed facility maps, retrieve parking space forecasts, or give step-by-step turn directions. How can I help you today?', timestamp: '12:00' }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const popularQueries = [
    { label: 'Wait Times', text: 'What is the current wait time at security?' },
    { label: 'Flight Status', text: 'Can you check my flight SG 123?' },
    { label: 'Lounges & Cafes', text: 'Are there any lounges or cafes nearby?' },
    { label: 'Airport Directions', text: 'How do I get to Gate A12?' },
    { label: 'Parking Status', text: 'Is there parking available?' },
    { label: 'Login Portal', text: 'Open the login portal' }
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend) => {
    if (!textToSend.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { role: 'user', text: textToSend, timestamp: timeStr }]);
    setInputText('');
    setLoading(true);

    // Frontend fallback routes & navigation (Section 8e)
    const txt = textToSend.toLowerCase();
    let clientRedirect = null;
    let clientResponse = null;

    if (txt.includes('login') || txt.includes('sign in')) {
      clientRedirect = '/login';
      clientResponse = 'Redirecting you to the login portal now.';
    } else if (txt.includes('parking')) {
      clientRedirect = '/parking';
      clientResponse = 'Redirecting you to the parking page now.';
    } else if (txt.includes('facilities') || txt.includes('directory') || txt.includes('shop') || txt.includes('cafe') || txt.includes('lounge')) {
      clientRedirect = '/facilities';
      clientResponse = 'Redirecting you to the facilities page now.';
    } else if (txt.includes('map') || txt.includes('directions') || txt.includes('gate') || txt.includes('get to')) {
      clientRedirect = '/directions';
      clientResponse = 'Redirecting you to the directions page now.';
    } else if (txt.includes('weather')) {
      clientRedirect = '/weather';
      clientResponse = 'Redirecting you to the weather page now.';
    } else if (txt.includes('flight')) {
      clientRedirect = '/flights';
      clientResponse = 'Redirecting you to the flights page now.';
    }

    try {
      // Connect to the actual backend endpoint (Section 8 - message, not query!)
      const res = await axios.post('http://127.0.0.1:8000/chatbot/message', {
        message: textToSend,
        session_id: 'passenger-portal-session'
      });

      setMessages(prev => [...prev, { role: 'bot', text: res.data.response, timestamp: timeStr }]);
      
      // Auto-navigation from API response route parameter (Section 8e)
      if (res.data.route) {
        setTimeout(() => {
          navigate(res.data.route);
        }, 1500);
      }
    } catch (err) {
      console.error("Chat API error, using client-side RAG fallback router:", err);
      setTimeout(() => {
        let fallbackMsg = clientResponse;
        if (!fallbackMsg) {
          fallbackMsg = "I can assist you with that! Try asking for 'parking availability', 'flight status board', or 'airport directions to Gate A12'.";
        }
        setMessages(prev => [...prev, { role: 'bot', text: fallbackMsg, timestamp: timeStr }]);
        
        if (clientRedirect) {
          setTimeout(() => {
            navigate(clientRedirect);
          }, 1500);
        }
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in text-[#0B3D66]">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0B3D66] hover:text-[#3FA9F5] hover:border-[#3FA9F5] cursor-pointer transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[#0B3D66]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Ask SkyGuide</h2>
            <p className="text-xs text-[#5A6B7B] mt-0.5">Your illustrated digital airport companion</p>
          </div>
        </div>
      </div>

      {/* Main Chat Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Chat Box (8 cols) */}
        <div className="lg:col-span-8 card bg-white flex flex-col overflow-hidden" style={{ height: '520px', borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}>
          {/* Avatar Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3 bg-[#EAF6FD]/30 shrink-0">
            <ChatbotAvatar isResponding={loading} />
            <div className="text-left">
              <span className="font-extrabold text-sm text-[#0B3D66] block" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>SkyGuide AI Assistant</span>
              <span className="text-[10px] text-[#34C77B] font-bold tracking-wider block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>ONLINE · READY</span>
            </div>
          </div>

          {/* Messages Log */}
          <div className="flex-grow p-6 overflow-y-auto space-y-5 bg-[#EAF6FD]/5 scrollbar-none">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex gap-3.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {m.role === 'bot' ? (
                  <ChatbotAvatar isResponding={false} />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#0B3D66] flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[75%] flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`p-4 rounded-xl text-sm leading-relaxed font-semibold ${
                      m.role === 'user'
                        ? 'bg-[#3FA9F5] text-white'
                        : 'bg-white text-[#0B3D66] border border-slate-200/60 shadow-sm'
                    }`}
                    style={{ whiteSpace: 'pre-line' }}
                  >
                    {/* Render basic bold formatting inside mockup replies */}
                    {m.text.split('**').map((chunk, i) => i % 2 === 1 ? <strong key={i} className="font-extrabold text-[#0B3D66]">{chunk}</strong> : chunk)}
                  </div>
                  <span className="text-[9px] text-[#8B95AB] mt-1 px-1 font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{m.timestamp}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3.5 items-center">
                <ChatbotAvatar isResponding={true} />
                <div className="flex items-center gap-1.5 bg-white border border-slate-200/50 p-4 rounded-xl shadow-sm">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3FA9F5] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3FA9F5] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3FA9F5] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white shrink-0">
            <input 
              type="text" 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText)}
              placeholder="Ask about gate directions, parking spaces, flight board..." 
              className="flex-grow py-3 px-4 bg-[#EAF6FD]/50 border border-slate-200 rounded-xl text-sm outline-none font-bold text-[#0B3D66] focus:border-[#3FA9F5] placeholder-slate-400"
              style={{ minHeight: '44px' }}
              disabled={loading}
            />
            <button 
              onClick={() => handleSendMessage(inputText)}
              disabled={loading || !inputText.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-[#3FA9F5] hover:bg-[#3FA9F5]/90 text-white cursor-pointer border-none shadow-md transition-all disabled:opacity-40"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Suggestion Shortcuts (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm">
          <span className="text-[10px] text-[#5A6B7B] font-bold uppercase tracking-wider block mb-4 font-mono">Suggested Questions</span>
          <div className="flex flex-col gap-2">
            {popularQueries.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(q.text)}
                disabled={loading}
                className="w-full text-left py-3.5 px-4 rounded-xl bg-[#EAF6FD]/20 border border-slate-200/50 text-[#0B3D66] hover:text-[#3FA9F5] hover:border-[#3FA9F5]/30 hover:bg-[#EAF6FD]/40 text-xs font-bold cursor-pointer transition-all select-none"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Embedded Animations Style block (Section 8a) */}
      <style>{`
        @keyframes avatar-idle {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-2px) rotate(1deg); }
        }
        @keyframes avatar-responding {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-1px) scale(1.03); }
        }
        @keyframes led-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-avatar-idle {
          animation: avatar-idle 4s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .animate-avatar-responding {
          animation: avatar-responding 1.2s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .animate-led-pulse {
          animation: led-pulse 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
