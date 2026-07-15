import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';

export default function Flights() {
  const navigate = useNavigate();
  const [activeScenario, setActiveScenario] = useState('reset');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('departures');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const r = await axios.get('http://127.0.0.1:8000/demo/status');
      setActiveScenario(r.data.scenario_id);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error(e);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const departures = activeScenario === 'weather_delay' ? [
    { time: '18:30', id: '6E 2043', airline: 'IndiGo', dest: 'MUMBAI (BOM)', gate: 'A12', terminal: 'T2', status: 'DELAYED 45M', statusType: 'delayed' },
    { time: '18:45', id: 'AI 804', airline: 'Air India', dest: 'BENGALURU (BLR)', gate: 'B05', terminal: 'T2', status: 'DELAYED 60M', statusType: 'delayed' },
    { time: '19:05', id: 'SG 123', airline: 'SpiceJet', dest: 'HYDERABAD (HYD)', gate: 'C07', terminal: 'T2', status: 'CANCELLED', statusType: 'cancelled' },
    { time: '19:20', id: 'UK 567', airline: 'Vistara', dest: 'KOLKATA (CCU)', gate: 'A03', terminal: 'T2', status: 'BOARDING', statusType: 'boarding' },
    { time: '19:45', id: '6E 309', airline: 'IndiGo', dest: 'CHENNAI (MAA)', gate: 'C11', terminal: 'T2', status: 'DELAYED 30M', statusType: 'delayed' },
    { time: '20:10', id: 'AI 662', airline: 'Air India', dest: 'GOA (GOI)', gate: 'B12', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' }
  ] : activeScenario === 'evening_rush' ? [
    { time: '18:30', id: '6E 2043', airline: 'IndiGo', dest: 'MUMBAI (BOM)', gate: 'A12', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '18:45', id: 'AI 804', airline: 'Air India', dest: 'BENGALURU (BLR)', gate: 'B05', terminal: 'T2', status: 'BOARDING', statusType: 'boarding' },
    { time: '19:05', id: 'SG 123', airline: 'SpiceJet', dest: 'HYDERABAD (HYD)', gate: 'C07', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '19:20', id: 'UK 567', airline: 'Vistara', dest: 'KOLKATA (CCU)', gate: 'A03', terminal: 'T2', status: 'DELAYED 15M', statusType: 'delayed' },
    { time: '19:45', id: '6E 309', airline: 'IndiGo', dest: 'CHENNAI (MAA)', gate: 'C11', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '20:10', id: 'AI 662', airline: 'Air India', dest: 'GOA (GOI)', gate: 'B12', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' }
  ] : [
    { time: '18:30', id: '6E 2043', airline: 'IndiGo', dest: 'MUMBAI (BOM)', gate: 'A12', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '18:45', id: 'AI 804', airline: 'Air India', dest: 'BENGALURU (BLR)', gate: 'B05', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '19:05', id: 'SG 123', airline: 'SpiceJet', dest: 'HYDERABAD (HYD)', gate: 'C07', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '19:20', id: 'UK 567', airline: 'Vistara', dest: 'KOLKATA (CCU)', gate: 'A03', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '19:45', id: '6E 309', airline: 'IndiGo', dest: 'CHENNAI (MAA)', gate: 'C11', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' },
    { time: '20:10', id: 'AI 662', airline: 'Air India', dest: 'GOA (GOI)', gate: 'B12', terminal: 'T2', status: 'ON TIME', statusType: 'ontime' }
  ];

  const arrivals = [
    { time: '18:15', id: 'IX 671', airline: 'Air India Express', dest: 'DELHI (DEL)', gate: 'A01', terminal: 'T2', status: 'LANDED', statusType: 'ontime' },
    { time: '18:50', id: '6E 211', airline: 'IndiGo', dest: 'MUMBAI (BOM)', gate: 'A02', terminal: 'T2', status: 'LANDED', statusType: 'ontime' },
    { time: '19:15', id: 'SG 810', airline: 'SpiceJet', dest: 'BENGALURU (BLR)', gate: 'B03', terminal: 'T2', status: activeScenario === 'weather_delay' ? 'DELAYED 30M' : 'ON TIME', statusType: activeScenario === 'weather_delay' ? 'delayed' : 'ontime' },
    { time: '19:40', id: 'UK 103', airline: 'Vistara', dest: 'HYDERABAD (HYD)', gate: 'A04', terminal: 'T2', status: activeScenario === 'weather_delay' ? 'DELAYED 15M' : 'ON TIME', statusType: activeScenario === 'weather_delay' ? 'delayed' : 'ontime' }
  ];

  const rawFlightsList = activeTab === 'departures' ? departures : arrivals;

  // Filter based on query
  const filteredFlights = rawFlightsList.filter(f => 
    f.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.dest.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.airline.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Status Pill Styling (Strictly following Section 0 colors)
  const getStatusClass = (type) => {
    if (type === 'delayed') return 'status-amber'; // Amber only for alerts
    if (type === 'cancelled') return 'status-red';  // Crimson for severe alerts
    if (type === 'boarding') return 'status-blue';   // Special blue status
    return 'status-green'; // Green for normal/safe
  };

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in text-[#0B3D66]">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0B3D66] hover:text-[#3FA9F5] hover:border-[#3FA9F5] cursor-pointer transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[#0B3D66]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Flight Board</h2>
            {lastUpdated && <p className="text-xs text-[#5A6B7B] mt-0.5">Last updated: {lastUpdated}</p>}
          </div>
        </div>
        <button onClick={load} disabled={loading} className="btn-soft flex items-center gap-2 py-2 px-4 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Board
        </button>
      </div>

      {/* Tabs - Departures and Arrivals side-by-side */}
      <div className="flex gap-3 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200/60">
        <button 
          onClick={() => setActiveTab('departures')} 
          className={`flex-1 py-3 rounded-lg text-base font-extrabold cursor-pointer transition-all border-none ${
            activeTab === 'departures' ? 'text-white' : 'bg-transparent text-[#5A6B7B] hover:text-[#0B3D66]'
          }`}
          style={activeTab === 'departures' ? { background: '#0B3D66' } : {}}
        >
          DEPARTURES
        </button>
        <button 
          onClick={() => setActiveTab('arrivals')} 
          className={`flex-1 py-3 rounded-lg text-base font-extrabold cursor-pointer transition-all border-none ${
            activeTab === 'arrivals' ? 'text-white' : 'bg-transparent text-[#5A6B7B] hover:text-[#0B3D66]'
          }`}
          style={activeTab === 'arrivals' ? { background: '#0B3D66' } : {}}
        >
          ARRIVALS
        </button>
      </div>

      {/* Search Bar - Large for accessibility (Section 2) */}
      <div className="relative flex gap-2">
        <div className="relative flex-grow">
          <Search className="w-5 h-5 text-[#5A6B7B] absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by flight number, airline, or city..." 
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-base outline-none text-[#0B3D66] font-medium placeholder-slate-400 focus:border-[#3FA9F5]" 
            style={{ minHeight: '48px', fontSize: '18px' }}
          />
        </div>
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="btn-soft px-5 py-3 text-sm font-bold cursor-pointer"
            style={{ minHeight: '48px' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Flight Board Table / Grid (Accessibility Optimized: Large Text, min-height 56px, high contrast) */}
      <div className="card-static overflow-hidden" style={{ border: '1px solid rgba(11,61,102,0.08)' }}>
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 bg-[#EAF6FD] px-6 py-4 border-b border-slate-200/60 text-xs font-bold uppercase tracking-wider text-[#0B3D66]">
          <div className="col-span-3 sm:col-span-2">Time</div>
          <div className="col-span-3 sm:col-span-2">Flight</div>
          <div className="col-span-3 sm:col-span-2">Airline</div>
          <div className="col-span-3 sm:col-span-3">{activeTab === 'departures' ? 'Destination' : 'Origin'}</div>
          <div className="col-span-2 sm:col-span-1">Gate</div>
          <div className="hidden sm:block sm:col-span-1">Term.</div>
          <div className="col-span-3 sm:col-span-1 text-right">Status</div>
        </div>

        {/* Table Content */}
        {filteredFlights.length === 0 ? (
          <div className="text-center py-16 text-[#5A6B7B] text-lg font-bold">
            No matching flights found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredFlights.map((flight, idx) => (
              <div 
                key={idx} 
                className="grid grid-cols-12 gap-2 px-6 items-center text-[#0B3D66]"
                style={{ minHeight: '64px', fontSize: '18px' }}
              >
                {/* Time (Scan item) */}
                <div className="col-span-3 sm:col-span-2 font-black" style={{ fontSize: '22px' }}>
                  {flight.time}
                </div>
                
                {/* Flight ID */}
                <div className="col-span-3 sm:col-span-2 font-bold tracking-tight">
                  {flight.id}
                </div>

                {/* Airline */}
                <div className="col-span-3 sm:col-span-2 font-medium">
                  {flight.airline}
                </div>

                {/* Destination */}
                <div className="col-span-3 sm:col-span-3 font-extrabold uppercase truncate" style={{ fontSize: '18px' }}>
                  {flight.dest}
                </div>

                {/* Gate (Scan item) */}
                <div className="col-span-2 sm:col-span-1 font-black text-center" style={{ fontSize: '22px' }}>
                  {flight.gate}
                </div>

                {/* Terminal */}
                <div className="hidden sm:block sm:col-span-1 font-bold text-center">
                  {flight.terminal}
                </div>

                {/* Status Pill */}
                <div className="col-span-3 sm:col-span-1 text-right">
                  <span className={`status-pill ${getStatusClass(flight.statusType)} inline-flex align-items-center gap-1.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      flight.statusType === 'delayed' ? 'bg-[#F2A93B]' : 
                      flight.statusType === 'cancelled' ? 'bg-[#D14B3D]' : 
                      flight.statusType === 'boarding' ? 'bg-[#3FA9F5]' : 'bg-[#34C77B]'
                    }`} />
                    {flight.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Access/Elderly Styling Definitions */}
      <style>{`
        .status-blue {
          background: rgba(63, 169, 245, 0.1);
          color: #3FA9F5;
        }
      `}</style>
    </div>
  );
}
