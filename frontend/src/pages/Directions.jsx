import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, ShieldAlert, Compass, MapPin, Navigation } from 'lucide-react';

export default function Directions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('security');

  const directionsData = {
    'check-in': {
      title: 'Check-in Desk Guide',
      from: { label: 'You are here', detail: 'Terminal 2' },
      to: { label: 'Check-in Counter', detail: 'Terminal 2' },
      time: 8,
      status: 'Light Crowd',
      statusType: 'low',
      description: 'Proceed straight from Entrance Gate 3. Row D is on your left, adjacent to the departures monitor.',
      markerColor: '#F2A93B',
      markerLabel: 'Check-in',
      pathD: 'M 80 220 C 120 200 160 160 200 140',
      startPos: { x: 80, y: 220 },
      endPos: { x: 200, y: 140 }
    },
    'security': {
      title: 'Security Check Guide',
      from: { label: 'You are here', detail: 'Terminal 2' },
      to: { label: 'Security Check', detail: 'Terminal 2' },
      time: 12,
      status: 'Moderate Crowd',
      statusType: 'medium',
      description: 'Head east past the baggage drop area. Turn left at the security signage queues.',
      markerColor: '#3FA873',
      markerLabel: 'Security Check',
      pathD: 'M 80 220 C 140 200 220 160 300 100',
      startPos: { x: 80, y: 220 },
      endPos: { x: 300, y: 100 }
    },
    'immigration': {
      title: 'Immigration Control',
      from: { label: 'Security Checkpoint', detail: 'Terminal 2' },
      to: { label: 'Immigration Desks', detail: 'Terminal 2' },
      time: 5,
      status: 'Light Crowd',
      statusType: 'low',
      description: 'Once past security, proceed to central immigration desks.',
      markerColor: '#8B5CF6',
      markerLabel: 'Immigration',
      pathD: 'M 200 180 C 240 160 280 130 340 120',
      startPos: { x: 200, y: 180 },
      endPos: { x: 340, y: 120 }
    },
    'gate': {
      title: 'Gate A12 Boarding',
      from: { label: 'Immigration Desks', detail: 'Terminal 2' },
      to: { label: 'Gate A12', detail: 'Concourse A' },
      time: 6,
      status: 'Low Congestion',
      statusType: 'low',
      description: 'Exit Immigration, take escalators down. Follow Concourse A indicators.',
      markerColor: '#003EBB',
      markerLabel: 'Gate A12',
      pathD: 'M 240 180 C 300 160 350 120 380 80',
      startPos: { x: 240, y: 180 },
      endPos: { x: 380, y: 80 }
    }
  };

  const tabs = [
    { id: 'check-in', label: 'Check-in', icon: Users },
    { id: 'security', label: 'Security', icon: ShieldAlert },
    { id: 'immigration', label: 'Immigration', icon: Compass },
    { id: 'gate', label: 'Gate A12', icon: MapPin }
  ];

  const activeData = directionsData[activeTab];

  const getStatusStyle = (type) => {
    if (type === 'medium') return 'text-[#F2A93B] bg-[#F2A93B]/10 border-[#F2A93B]/20';
    return 'text-[#3FA873] bg-[#3FA873]/10 border-[#3FA873]/20';
  };

  return (
    <div className="min-h-screen text-primary flex flex-col p-6" style={{ background: '#F7F9FB' }}>
      
      {/* Navigation Header */}
      <div className="flex flex-col gap-4 pb-5 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg cursor-pointer transition-all shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Step Tabs */}
          <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-200/60 select-none overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border-none whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-[#0B1E33] text-white shadow-sm'
                      : 'bg-transparent text-slate-400 hover:text-slate-600'
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <Icon className="w-3.5 h-3.5" /> {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 flex-grow items-start">
        
        {/* Left Panel: Instructions */}
        <div className="lg:col-span-4 bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between" style={{ minHeight: '400px' }}>
          <div className="space-y-5">
            <div>
              <span className="text-[9px] text-[#003EBB] font-bold uppercase tracking-[0.15em] block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Waypoint Step</span>
              <h3 className="text-xl font-extrabold text-[#0B1E33] tracking-tight mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{activeData.title}</h3>
            </div>

            {/* From / To */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full bg-slate-300 border-2 border-slate-400 shrink-0" />
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>From</span>
                  <span className="font-semibold text-slate-700 text-sm">{activeData.from.label}</span>
                  <span className="text-[10px] text-slate-400 block">{activeData.from.detail}</span>
                </div>
              </div>
              
              <div className="w-[2px] h-5 bg-slate-200 ml-[5px]" />
              
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="w-3 h-3 rounded-full bg-[#003EBB] border-2 border-[#003EBB] shrink-0" />
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-[#003EBB] font-bold uppercase tracking-wider block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>To</span>
                  <span className="font-bold text-[#0B1E33] text-sm">{activeData.to.label}</span>
                  <span className="text-[10px] text-slate-400 block">{activeData.to.detail}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
              {activeData.description}
            </p>
          </div>

          {/* Bottom: Time + Button */}
          <div className="border-t border-slate-100 pt-4 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[9px] text-slate-400 font-bold uppercase block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Estimated Time</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-extrabold text-[#0B1E33]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{activeData.time} min</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getStatusStyle(activeData.statusType)}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {activeData.status}
                </span>
              </div>
            </div>
            <button className="py-2.5 px-5 bg-[#003EBB] hover:bg-[#0050DD] text-white rounded-xl text-[10px] font-bold uppercase tracking-wider cursor-pointer border-none shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5" />
              Start Directions
            </button>
          </div>
        </div>

        {/* Right Panel: SVG Map */}
        <div className="lg:col-span-8 bg-white border border-slate-200/60 rounded-2xl p-4 shadow-sm flex items-center justify-center relative overflow-hidden select-none" style={{ minHeight: '400px' }}>
          <svg viewBox="0 0 450 280" className="w-full h-full">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(0,62,187,0.04)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="450" height="280" fill="url(#grid)" />

            {/* Terminal outline */}
            <rect x="40" y="60" width="370" height="180" rx="8" fill="none" stroke="rgba(0,62,187,0.08)" strokeWidth="1.5" />
            
            {/* Terminal zones */}
            <rect x="60" y="80" width="120" height="60" rx="4" fill="rgba(0,62,187,0.03)" stroke="rgba(0,62,187,0.08)" />
            <text x="120" y="115" textAnchor="middle" fill="#94a3b8" className="text-[8px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>CHECK-IN</text>

            <rect x="200" y="70" width="100" height="50" rx="4" fill="rgba(0,62,187,0.03)" stroke="rgba(0,62,187,0.08)" />
            <text x="250" y="100" textAnchor="middle" fill="#94a3b8" className="text-[8px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SECURITY</text>

            <rect x="320" y="75" width="70" height="50" rx="4" fill="rgba(0,62,187,0.03)" stroke="rgba(0,62,187,0.08)" />
            <text x="355" y="105" textAnchor="middle" fill="#94a3b8" className="text-[7px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>IMMIGRATION</text>

            {/* Gate markers */}
            <circle cx="390" cy="80" r="12" fill="#EBF3FF" stroke="#003EBB" strokeWidth="1.5" />
            <text x="390" y="83" textAnchor="middle" fill="#003EBB" className="text-[7px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>A12</text>

            {/* Main corridor path (background) */}
            <path d="M 60 220 C 120 210 200 170 260 130 C 300 110 340 90 390 80" fill="none" stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />

            {/* Active animated path */}
            <path d={activeData.pathD} fill="none" stroke="#003EBB" strokeWidth="3" strokeDasharray="6 4" strokeLinecap="round" style={{ animation: 'dash 1.5s linear infinite' }} />

            {/* Start marker - You are here */}
            <circle cx={activeData.startPos.x} cy={activeData.startPos.y} r="8" fill="#003EBB" />
            <circle cx={activeData.startPos.x} cy={activeData.startPos.y} r="14" fill="none" stroke="#003EBB" strokeWidth="1.5" opacity="0.4" className="pulse-ring-anim" />
            <rect x={activeData.startPos.x - 28} y={activeData.startPos.y + 14} width="56" height="16" rx="4" fill="#003EBB" />
            <text x={activeData.startPos.x} y={activeData.startPos.y + 25} textAnchor="middle" fill="white" className="text-[6px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>You are here</text>

            {/* End marker - Destination */}
            <circle cx={activeData.endPos.x} cy={activeData.endPos.y} r="10" fill={activeData.markerColor} />
            <circle cx={activeData.endPos.x} cy={activeData.endPos.y} r="5" fill="white" />
            <text x={activeData.endPos.x} y={activeData.endPos.y - 16} textAnchor="middle" fill={activeData.markerColor} className="text-[7px] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{activeData.markerLabel}</text>
          </svg>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <button className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 bg-transparent border-none cursor-pointer transition-colors">+</button>
            <div className="h-[1px] bg-slate-100 mx-1" />
            <button className="w-8 h-8 flex items-center justify-center text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 bg-transparent border-none cursor-pointer transition-colors">−</button>
          </div>

          {/* Live badge */}
          <div className="absolute top-4 left-4 bg-[#0B1E33] rounded-lg px-3 py-1.5 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#3FA873] pulse-gentle" />
            <span className="text-[9px] text-slate-300 font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Terminal 2 Layout</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -20; }
        }
      `}</style>
    </div>
  );
}
