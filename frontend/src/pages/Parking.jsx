import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Car, CheckCircle, Search, Info } from 'lucide-react';

export default function Parking() {
  const navigate = useNavigate();
  const [plate, setPlate] = useState('');
  const [found, setFound] = useState(null);
  const [selected, setSelected] = useState('P2');

  const lots = [
    { id: 'P1', name: 'Premium Parking', pct: 32, status: 'Available', rush: 'Peak rush expected between 14:00 - 17:00 daily.' },
    { id: 'P2', name: 'Covered Parking', pct: 67, status: 'Available', rush: 'Peak rush expected between 08:00 - 11:00 and 18:00 - 21:00.' },
    { id: 'P3', name: 'Economy Lot', pct: 85, status: 'Nearly Full', rush: 'Steady filling. High volumes expected on weekends.' },
    { id: 'P4', name: 'Long Stay Lot', pct: 95, status: 'Nearly Full', rush: 'Generally full. Highly recommended to book online.' }
  ];

  const locate = (e) => {
    e.preventDefault();
    if (!plate.trim()) return;
    setFound({ msg: `Found in P2 Covered, Level 2, Bay B-14. Take Lift Lobby 2.` });
    setSelected('P2');
  };

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in text-[#0B3D66]">
      {/* Top Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0B3D66] hover:text-[#3FA9F5] hover:border-[#3FA9F5] cursor-pointer transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[#0B3D66]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Smart Parking</h2>
            <p className="text-xs text-[#5A6B7B] mt-0.5">Real-time space occupancy and vehicle locator</p>
          </div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Lots list & Search (5-span) */}
        <div className="lg:col-span-6 space-y-6">
          
          {/* Availability Cards Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#5A6B7B] uppercase tracking-wider font-mono">Lot Availability</h3>
            
            <div className="space-y-3">
              {lots.map(l => {
                const isNearlyFull = l.pct >= 80;
                const isSelected = selected === l.id;
                
                return (
                  <div 
                    key={l.id} 
                    onClick={() => setSelected(l.id)} 
                    className="card p-5 cursor-pointer transition-all relative overflow-hidden" 
                    style={{ 
                      borderRadius: '12px', 
                      border: isSelected ? '2px solid #3FA9F5' : '1px solid rgba(11,61,102,0.08)',
                      background: isNearlyFull ? '#EAF6FD' : '#FFFFFF' // Pale Blue background when over 80% full
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-black font-mono"
                          style={{ background: isNearlyFull ? '#0B3D66' : '#3FA9F5' }}
                        >
                          {l.id}
                        </div>
                        <div>
                          <p className="font-extrabold text-sm text-[#0B3D66]">{l.name}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 uppercase ${
                            isNearlyFull ? 'bg-[#F2A93B]/10 text-[#F2A93B] border border-[#F2A93B]/20' : 'bg-green-500/10 text-green-600'
                          }`}>
                            {l.status}
                          </span>
                        </div>
                      </div>

                      {/* Large Occupancy Percentage */}
                      <div className="text-right">
                        <span className="text-2xl font-black text-[#0B3D66] font-mono">{l.pct}%</span>
                        <p className="text-[9px] text-[#5A6B7B] font-bold uppercase mt-0.5">Occupied</p>
                      </div>
                    </div>

                    {/* Progress indicator with car emoji at the leading edge (Section 4) */}
                    <div className="relative w-full h-2.5 bg-slate-100 rounded-full mt-4 overflow-visible">
                      <div 
                        className="h-full rounded-full transition-all duration-500" 
                        style={{ 
                          width: `${l.pct}%`, 
                          background: isNearlyFull ? '#F2A93B' : '#3FA9F5' // Light Blue accent fill
                        }} 
                      />
                      <span 
                        className="absolute -top-[5px] text-[13px] transition-all duration-500" 
                        style={{ left: `calc(${l.pct}% - 8px)` }}
                      >
                        🚗
                      </span>
                    </div>

                    {/* Rush Hour Window Description (Section 4) */}
                    <div className="flex items-start gap-1.5 mt-4 pt-3 border-t border-slate-200/50">
                      <Info className="w-3.5 h-3.5 text-[#5A6B7B] shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#5A6B7B] font-medium leading-relaxed">
                        {l.rush}
                      </p>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Find your car tool */}
          <div className="card p-6" style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-5 h-5 text-[#3FA9F5]" />
              <h3 className="font-extrabold text-sm text-[#0B3D66]">Find Your Car</h3>
            </div>
            
            <form onSubmit={locate} className="flex gap-2">
              <div className="relative flex-grow">
                <Search className="w-4 h-4 text-[#5A6B7B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={plate} 
                  onChange={e => setPlate(e.target.value)} 
                  placeholder="Enter vehicle number..." 
                  className="w-full pl-10 pr-4 py-3 bg-[#EAF6FD]/50 border border-slate-200 rounded-xl text-sm outline-none uppercase text-[#0B3D66] font-bold" 
                  style={{ fontFamily: "'JetBrains Mono', monospace", minHeight: '42px' }} 
                />
              </div>
              <button type="submit" className="btn-primary text-xs py-2 px-5 whitespace-nowrap">Locate Vehicle</button>
            </form>

            {found && (
              <div className="mt-4 p-4 rounded-xl flex items-start gap-3 animate-fade-in-up" style={{ background: '#EAF6FD', border: '1px solid rgba(63,169,245,0.2)' }}>
                <CheckCircle className="w-5 h-5 text-[#3FA9F5] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-black text-[#3FA9F5] uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Vehicle Located</p>
                  <p className="text-xs font-bold text-[#0B3D66] mt-1">{found.msg}</p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Side: Map Display (7-span) */}
        <div className="lg:col-span-6">
          <div className="card-static p-6 flex flex-col justify-between" style={{ background: '#0B3D66', borderRadius: '12px', minHeight: '400px' }}>
            <div>
              <p className="text-[9px] text-[#3FA9F5] font-bold uppercase tracking-wider mb-4" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Incheon Terminal Parking Grid</p>
              <h3 className="text-lg font-extrabold text-white mb-2">Live Parking Map</h3>
              <p className="text-xs text-slate-300 leading-relaxed">Select any parking lot on the left to highlight its terminal zone below.</p>
            </div>
            
            <div className="flex-grow flex items-center justify-center py-4">
              <svg viewBox="0 0 400 250" className="w-full h-full max-h-[250px]">
                <defs>
                  <pattern id="pgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(63,169,245,0.08)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="400" height="250" fill="url(#pgrid)" />
                {lots.map((l, i) => {
                  const rects = [
                    { x: 30, y: 30, w: 150, h: 80, textX: 105, textY: 75 },
                    { x: 220, y: 30, w: 150, h: 80, textX: 295, textY: 75 },
                    { x: 30, y: 140, w: 150, h: 80, textX: 105, textY: 185 },
                    { x: 220, y: 140, w: 150, h: 80, textX: 295, textY: 185 }
                  ];
                  const r = rects[i];
                  const isSel = selected === l.id;
                  
                  return (
                    <g key={l.id} className="cursor-pointer" onClick={() => setSelected(l.id)}>
                      <rect 
                        x={r.x} 
                        y={r.y} 
                        width={r.w} 
                        height={r.h} 
                        rx="8" 
                        fill={isSel ? 'rgba(63,169,245,0.15)' : 'rgba(255,255,255,0.03)'} 
                        stroke={isSel ? '#3FA9F5' : 'rgba(255,255,255,0.1)'} 
                        strokeWidth={isSel ? 2.5 : 1.5} 
                        className="transition-all"
                      />
                      <text 
                        x={r.textX} 
                        y={r.textY} 
                        textAnchor="middle" 
                        fill={isSel ? '#3FA9F5' : '#8B95AB'} 
                        style={{ fontSize: '12px', fontWeight: '800', fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {l.id}
                      </text>
                      <text 
                        x={r.textX} 
                        y={r.textY + 16} 
                        textAnchor="middle" 
                        fill={isSel ? '#FFFFFF' : '#5A6B7B'} 
                        style={{ fontSize: '9px', fontWeight: 'bold' }}
                      >
                        {l.name}
                      </text>
                    </g>
                  );
                })}
                {found && selected === 'P2' && (
                  <>
                    <circle cx="295" cy="70" r="5" fill="#D14B3D" className="pulse-soft" />
                    <text x="295" y="55" textAnchor="middle" fill="#D14B3D" style={{ fontSize: '8px', fontWeight: 'bold', fontFamily: "'JetBrains Mono', monospace" }}>YOUR CAR</text>
                  </>
                )}
              </svg>
            </div>
            
            <div className="pt-3 border-t border-white/5 flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
              <span>Gate Entry 1 / 3 / 5</span>
              <span>Incheon T2 Operations</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
