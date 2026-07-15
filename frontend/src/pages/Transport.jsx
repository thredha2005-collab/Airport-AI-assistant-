import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Train, Bus, Car, Clock, DollarSign, MapPin, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function Transport() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('arex');
  const [loading, setLoading] = useState(false);

  const arexSchedules = {
    express: [
      { dep: '13:30', arr: '14:13', duration: 43, status: 'On Time', price: '₩9,500' },
      { dep: '14:10', arr: '14:53', duration: 43, status: 'On Time', price: '₩9,500' },
      { dep: '14:50', arr: '15:33', duration: 43, status: 'On Time', price: '₩9,500' },
      { dep: '15:30', arr: '16:13', duration: 43, status: 'On Time', price: '₩9,500' }
    ],
    allStop: [
      { dep: '13:38', arr: '14:31', duration: 53, status: 'On Time', price: '₩4,750' },
      { dep: '13:50', arr: '14:43', duration: 53, status: 'On Time', price: '₩4,750' },
      { dep: '14:02', arr: '14:55', duration: 53, status: 'On Time', price: '₩4,750' },
      { dep: '14:14', arr: '15:07', duration: 53, status: 'On Time', price: '₩4,750' }
    ]
  };

  const busRoutes = [
    { number: '6001', destination: 'Myeong-dong / Seoul Station', interval: '15-25 min', gate: 'T2 B1 Floor 29', price: '₩17,000', status: 'Normal' },
    { number: '6002', destination: 'Mapo / Sinchon / Cheongnyangni', interval: '15-30 min', gate: 'T2 B1 Floor 30', price: '₩16,000', status: 'Normal' },
    { number: '6006', destination: 'Jamsil / Gangnam', interval: '20-30 min', gate: 'T2 B1 Floor 14', price: '₩17,000', status: 'Normal' },
    { number: '6015', destination: 'Mapo Station / Myeong-dong', interval: '12-20 min', gate: 'T2 B1 Floor 28', price: '₩17,000', status: 'Normal' }
  ];

  const taxiTypes = [
    { type: 'Standard', fare: '₩45,000 - ₩55,000', wait: '2-5 min', gate: 'T2 1F Gate 5C', color: '#FF8C42', desc: 'Standard sedan taxi for up to 4 passengers.' },
    { type: 'Deluxe (Mobeom)', fare: '₩70,000 - ₩85,000', wait: '0 min', gate: 'T2 1F Gate 7C', color: '#1A2138', desc: 'Premium black sedan taxi with experienced drivers.' },
    { type: 'Jumbo / Large', fare: '₩75,000 - ₩90,000', wait: '5-10 min', gate: 'T2 1F Gate 6C', color: '#1B4B8F', desc: 'Minivan taxi for larger groups or excessive luggage.' },
    { type: 'International', fare: '₩55,000 - ₩70,000 (Flat)', wait: 'Booking Required', gate: 'T2 1F Gate 4C', color: '#34C77B', desc: 'Foreign language service (English/Chinese/Japanese).' }
  ];

  const refreshTimes = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 600);
  };

  return (
    <div className="flex flex-col gap-5 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-[#5A6785] cursor-pointer border-none" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-xl font-extrabold text-[#1A2138]">Public Transportation</h2>
        </div>
        <button onClick={refreshTimes} disabled={loading} className="btn-soft flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white p-1 rounded-xl" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        {[
          { id: 'arex', label: 'AREX Train', icon: Train },
          { id: 'bus', label: 'Limousine Bus', icon: Bus },
          { id: 'taxi', label: 'Taxi Stands', icon: Car }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                isActive ? 'text-white' : 'bg-transparent text-[#8B95AB] hover:text-[#5A6785]'
              }`}
              style={isActive ? { background: 'linear-gradient(135deg, #4A8FE7, #1B4B8F)' } : {}}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* AREX Tab Content */}
      {activeTab === 'arex' && (
        <div className="flex flex-col gap-6">
          {/* Feature Header Card */}
          <div className="card-static p-5" style={{ background: 'linear-gradient(135deg, #E8F0FE, #F0F6FF)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#1B4B8F]">
                <Train className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-[15px] font-bold text-[#1A2138]">Airport Railroad Express (AREX)</h3>
                <p className="text-[11px] text-[#5A6785] mt-0.5">Fastest route between Incheon T2 and Seoul Station.</p>
              </div>
            </div>
            <div className="flex gap-4 mt-4 pt-3 border-t border-[#D5E3FA] text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-[#1A2138]"><Clock className="w-3.5 h-3.5 text-[#1B4B8F]" /> Express: 43 mins</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#1A2138]"><MapPin className="w-3.5 h-3.5 text-[#1B4B8F]" /> Platform: B1 Floor T2</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Express Train */}
            <div className="card p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-bold text-white bg-[#1B4B8F] px-2 py-0.5 rounded-full uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Direct</span>
                  <h4 className="font-bold text-sm text-[#1A2138] mt-1">Express Train</h4>
                </div>
                <span className="text-sm font-extrabold text-[#1B4B8F]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>₩9,500</span>
              </div>
              <div className="space-y-3">
                {arexSchedules.express.map((train, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-[#F8FAFD] rounded-xl">
                    <div>
                      <span className="font-bold text-[#1A2138]">{train.dep}</span>
                      <span className="text-[#8B95AB] mx-2">➔</span>
                      <span className="font-semibold text-[#5A6785]">{train.arr}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#8B95AB]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{train.duration} min</span>
                      <span className="status-pill status-green"><span className="w-1.5 h-1.5 rounded-full bg-[#34C77B]" />{train.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Stop Train */}
            <div className="card p-5 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <div>
                  <span className="text-[9px] font-bold text-[#5A6785] bg-[#F0F4FA] px-2 py-0.5 rounded-full uppercase" style={{ fontFamily: "'JetBrains Mono', monospace" }}>11 Stops</span>
                  <h4 className="font-bold text-sm text-[#1A2138] mt-1">All Stop Train</h4>
                </div>
                <span className="text-sm font-extrabold text-[#5A6785]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>₩4,750</span>
              </div>
              <div className="space-y-3">
                {arexSchedules.allStop.map((train, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2 bg-[#F8FAFD] rounded-xl">
                    <div>
                      <span className="font-bold text-[#1A2138]">{train.dep}</span>
                      <span className="text-[#8B95AB] mx-2">➔</span>
                      <span className="font-semibold text-[#5A6785]">{train.arr}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-[#8B95AB]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{train.duration} min</span>
                      <span className="status-pill status-green"><span className="w-1.5 h-1.5 rounded-full bg-[#34C77B]" />{train.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bus Tab Content */}
      {activeTab === 'bus' && (
        <div className="flex flex-col gap-4">
          <div className="card-static p-4 flex items-center justify-between" style={{ background: '#FFF5EB' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#FF8C42]">
                <Bus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1A2138]">Airport Limousine Buses</h3>
                <p className="text-[11px] text-[#5A6785] mt-0.5">Direct express buses connecting Airport with major hotels and areas across Seoul.</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {busRoutes.map((bus, i) => (
              <div key={i} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="w-12 h-10 rounded-xl bg-[#F0F6FF] text-[#1B4B8F] flex items-center justify-center font-extrabold text-[13px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{bus.number}</span>
                  <div>
                    <p className="font-bold text-sm text-[#1A2138]">{bus.destination}</p>
                    <p className="text-[10px] text-[#8B95AB] mt-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#FF8C42]" /> Ticket Box: B1 Floor Terminal 2</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] text-[#8B95AB] uppercase font-bold">Bus Stop Gate</p>
                    <p className="text-xs font-bold text-[#1A2138] mt-0.5">{bus.gate}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] text-[#8B95AB] uppercase font-bold">Price</p>
                    <p className="text-xs font-bold text-[#1A2138] mt-0.5">{bus.price}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-[9px] text-[#8B95AB] uppercase font-bold">Interval</p>
                    <p className="text-xs font-bold text-[#1A2138] mt-0.5">{bus.interval}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Taxi Tab Content */}
      {activeTab === 'taxi' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {taxiTypes.map((taxi, i) => (
            <div key={i} className="card p-5 flex flex-col justify-between" style={{ minHeight: '180px' }}>
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-base text-[#1A2138]">{taxi.type}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${taxi.color}15`, color: taxi.color }}>{taxi.gate}</span>
                </div>
                <p className="text-xs text-[#8B95AB] leading-relaxed mt-2">{taxi.desc}</p>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4 text-xs font-semibold">
                <span className="flex items-center gap-1 text-[#5A6785]"><Clock className="w-3.5 h-3.5" /> Wait: {taxi.wait}</span>
                <span className="flex items-center gap-0.5 text-[#1B4B8F] font-bold"><DollarSign className="w-3.5 h-3.5" /> Est. {taxi.fare}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
