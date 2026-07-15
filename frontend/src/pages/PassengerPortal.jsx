import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plane, Clock, ShieldAlert, RefreshCw, LogOut, ArrowRight, CheckCircle2, Ticket, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PassengerPortal({ auth, logout }) {
  const [itinerary, setItinerary] = useState(null);
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimedCoupons, setClaimedCoupons] = useState({});
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const pnr = auth.pnr || localStorage.getItem('pnr') || '9GACQD';

  const fetchItinerary = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await axios.get(`http://127.0.0.1:8000/passenger/${pnr}/itinerary`);
      setItinerary(res.data);
      
      const wRes = await axios.get('http://127.0.0.1:8000/weather/current');
      setWeather(wRes.data);
    } catch (err) {
      console.error(err);
      setError("We couldn't retrieve your flight details. Verify your PNR reference and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItinerary();
  }, [pnr]);

  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[#0B3D66]">
        <RefreshCw className="w-8 h-8 text-[#3FA9F5] animate-spin mx-auto mb-4" />
        <p className="text-sm font-semibold">Retrieving your travel schedule...</p>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center text-[#0B3D66]">
        <div className="card p-6 border border-slate-200">
          <ShieldAlert className="w-12 h-12 text-[#D14B3D] mx-auto mb-4" />
          <h3 className="font-extrabold text-lg mb-2">Error Loading Portal</h3>
          <p className="text-sm text-[#5A6B7B] mb-6">{error || "No booking record loaded."}</p>
          <button onClick={() => navigate('/login')} className="btn-primary w-full py-3 text-base">Go to Sign In</button>
        </div>
      </div>
    );
  }

  const depTime = new Date(itinerary.scheduled_departure);
  const recTime = new Date(itinerary.recommended_arrival_time);

  let weatherWarning = "";
  if (weather) {
    if (weather.condition === 'rain' || weather.condition === 'storm') {
      weatherWarning = `Expect rain conditions at the airport. We recommend leaving earlier than the recommended arrival time to accommodate traffic.`;
    }
  }

  // Determine Congestion Color (Section 0)
  const getCongestionStatus = (minutes) => {
    if (minutes === 0) return { text: 'Bypassed', class: 'bg-slate-100 text-[#5A6B7B] border-slate-200' };
    if (minutes > 20) return { text: 'Heavy Queue', class: 'status-red' }; // Crimson for high alerts
    if (minutes > 12) return { text: 'Moderate Queue', class: 'status-amber' }; // Amber for moderate alerts
    return { text: 'Low Queue', class: 'status-green' }; // Green for normal
  };

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in text-[#0B3D66]">
      <div className="max-w-4xl w-full space-y-6 mx-auto">
        
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] text-[#5A6B7B] uppercase tracking-wider font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Personal Passenger Portal</span>
            <h2 className="text-2xl font-extrabold text-[#0B3D66] mt-0.5">Welcome, {itinerary.full_name}</h2>
          </div>
          <button 
            onClick={handleLogoutClick} 
            className="btn-soft flex items-center gap-1.5 py-2.5 px-4 text-xs font-bold uppercase"
          >
            <LogOut className="w-3.5 h-3.5" /> Log Out
          </button>
        </div>

        {/* Outer Column Grid (Optimized for Senior Access) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Main Left Area: Arrival Recommendation & Details (8-span) */}
          <div className="md:col-span-8 space-y-6">
            
            {/* RECOMMENDED ARRIVAL TIME (LARGEST, MOST PROMINENT BLOCK - Section 3) */}
            <div className="card p-8 flex flex-col items-center justify-center text-center relative overflow-hidden bg-white" style={{ border: '2px solid #0B3D66' }}>
              <span className="text-xs text-[#3FA9F5] font-extrabold uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Recommended Arrival Time</span>
              
              {/* Huge Time Display */}
              <h1 className="text-6xl md:text-7xl font-black text-[#0B3D66] mt-3 mb-2 font-mono" style={{ fontSize: '72px' }}>
                {recTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </h1>
              <h3 className="text-base font-bold text-[#0B3D66] uppercase tracking-wider">Arrive at Airport By This Time</h3>
              <p className="text-xs text-[#5A6B7B] leading-normal max-w-md mt-4 font-semibold">
                Calculated using live checkpoint wait forecasts, airport walking metrics, and a 45-minute gate boarding window.
              </p>
            </div>

            {/* Itinerary details ticket stub (Large text & High contrast - Section 3) */}
            <div className="card p-6 relative overflow-hidden space-y-6 bg-white" style={{ border: '1px solid rgba(11,61,102,0.08)' }}>
              {/* Notch perforations */}
              <div className="absolute top-20 left-0 w-2.5 h-5 bg-[#EAF6FD] rounded-r-full border-r border-slate-200" />
              <div className="absolute top-20 right-0 w-2.5 h-5 bg-[#EAF6FD] rounded-l-full border-l border-slate-200" />
              <div className="absolute top-[88px] left-4 right-4 h-px border-t border-dashed border-slate-200" />

              <div className="flex justify-between items-center pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #3FA9F5, #0B3D66)' }}>
                    <Plane className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#0B3D66]" style={{ fontSize: '20px' }}>{itinerary.airline} {itinerary.flight_number}</h4>
                    <span className="text-xs text-[#5A6B7B] font-bold block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{itinerary.origin} ➔ {itinerary.destination}</span>
                  </div>
                </div>
                <span className={`status-pill ${
                  itinerary.status === 'delayed' ? 'status-red' :
                  itinerary.status === 'boarding' ? 'status-blue' : 'status-green'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    itinerary.status === 'delayed' ? 'bg-[#D14B3D]' :
                    itinerary.status === 'boarding' ? 'bg-[#3FA9F5]' : 'bg-[#34C77B]'
                  }`} />
                  {itinerary.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 font-semibold" style={{ fontSize: '18px' }}>
                <div>
                  <span className="text-[10px] text-[#5A6B7B] uppercase tracking-wider block font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Scheduled Departure</span>
                  <span className="font-black text-[#0B3D66] block mt-1" style={{ fontSize: '22px', fontFamily: "'JetBrains Mono', monospace" }}>{depTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5A6B7B] uppercase tracking-wider block font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Gate / Terminal</span>
                  <span className="font-black text-[#0B3D66] block mt-1" style={{ fontSize: '22px', fontFamily: "'JetBrains Mono', monospace" }}>{itinerary.terminal} / G{itinerary.gate_number || "TBD"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5A6B7B] uppercase tracking-wider block font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Cabin Seat</span>
                  <span className="font-black text-[#0B3D66] block mt-1" style={{ fontSize: '22px', fontFamily: "'JetBrains Mono', monospace" }}>Seat 23A</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5A6B7B] uppercase tracking-wider block font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Booking Ref</span>
                  <span className="font-black text-[#0B3D66] block mt-1" style={{ fontSize: '22px', fontFamily: "'JetBrains Mono', monospace" }}>{itinerary.pnr_booking_ref}</span>
                </div>
              </div>

              {weatherWarning && (
                <div className="p-4 bg-[#FFF5EB] border border-[#F2A93B]/20 rounded-xl flex items-start gap-3 mt-4">
                  <ShieldAlert className="w-5 h-5 text-[#F2A93B] shrink-0 mt-0.5" />
                  <div className="text-amber-800 leading-normal font-semibold text-xs">
                    <span className="font-extrabold block mb-0.5 text-amber-900">Weather Notice</span>
                    {weatherWarning}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Right Side: Predicted Checkpoint Wait Times (4-span, reorganized as clear high-contrast rows) */}
          <div className="md:col-span-4 flex flex-col h-full">
            <div className="card-static p-6 flex-grow flex flex-col justify-between gap-6" style={{ border: '1px solid rgba(11,61,102,0.08)' }}>
              <div>
                <h4 className="font-bold text-[#0B3D66] uppercase tracking-widest text-xs pb-3 border-b border-slate-100 font-mono mb-4">
                  Checkpoint wait times
                </h4>
                
                {/* Checkpoint Rows - High Contrast and 18px+ text spacing */}
                <div className="space-y-4">
                  {Object.entries(itinerary.predicted_wait_times).map(([checkpoint, minutes]) => (
                    <div 
                      key={checkpoint} 
                      className="flex flex-col gap-1 p-3 bg-[#EAF6FD] rounded-xl border border-[#3FA9F5]/10"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-[#0B3D66]" style={{ fontSize: '18px' }}>{checkpoint}</span>
                        <span className="font-black text-[#0B3D66]" style={{ fontSize: '22px', fontFamily: "'JetBrains Mono', monospace" }}>
                          {minutes === 0 ? "—" : `${Math.round(minutes)} min`}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] text-[#5A6B7B] font-bold uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Live delay forecast</span>
                        <span className={`status-pill ${getCongestionStatus(minutes).class}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            getCongestionStatus(minutes).class === 'status-red' ? 'bg-[#D14B3D]' : 
                            getCongestionStatus(minutes).class === 'status-amber' ? 'bg-[#F2A93B]' : 'bg-[#34C77B]'
                          }`} />
                          {getCongestionStatus(minutes).text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* QR Boarding pass Mockup */}
              <div className="pt-4 border-t border-slate-100 text-center space-y-2">
                <span className="text-[10px] text-[#5A6B7B] uppercase tracking-widest block font-mono font-bold">QR stub barcode</span>
                <div className="w-24 h-24 bg-[#0B3D66] mx-auto rounded-xl p-3 flex flex-wrap shadow-inner border border-slate-800">
                  {[...Array(64)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-[12.5%] h-[12.5%] ${
                        (i * 7 + 13) % 5 === 0 || (i % 8 === 0 && i < 24) || (i > 40 && i % 3 === 0) ? 'bg-white' : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#0B3D66] block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>PNR: {itinerary.pnr_booking_ref}</span>
              </div>

            </div>
          </div>

        </div>

        {/* Membership & Perks Section (Incheon Airport+ Style, Colored matching Section 0) */}
        <div className="mt-8 pt-8 border-t border-slate-100">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#EAF6FD] flex items-center justify-center text-[#3FA9F5]">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#0B3D66] tracking-tight">ICN Star VIP Membership</h3>
              <p className="text-xs text-[#5A6B7B]">Exclusive passenger perks and duty-free partner coupons.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Membership Details Card */}
            <div className="lg:col-span-5 card-static p-6 space-y-5 bg-white" style={{ border: '1px solid rgba(11,61,102,0.08)' }}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[9px] font-bold text-[#3FA9F5] bg-[#EAF6FD] px-2.5 py-0.5 rounded-full uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Member Tier</span>
                  <h4 className="text-2xl font-extrabold text-[#0B3D66] mt-2">ICN STAR ⭐</h4>
                  <p className="text-xs text-[#5A6B7B] mt-1.5 leading-normal font-semibold">
                    {itinerary.full_name || "Passenger"} is a verified Star Tier member. Earn 64 points to upgrade to Elite tier.
                  </p>
                </div>
              </div>

              {/* Point Tracker */}
              <div className="grid grid-cols-2 gap-4 bg-[#EAF6FD] p-4 rounded-xl border border-[#3FA9F5]/10">
                <div>
                  <span className="text-[9px] text-[#5A6B7B] font-bold uppercase tracking-wider block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Accumulated</span>
                  <span className="text-2xl font-extrabold text-[#0B3D66]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>180</span>
                  <span className="text-[10px] text-[#5A6B7B] font-bold ml-1">pts</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#5A6B7B] font-bold uppercase tracking-wider block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Available</span>
                  <span className="text-2xl font-extrabold text-[#3FA9F5]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>180</span>
                  <span className="text-[10px] text-[#5A6B7B] font-bold ml-1">pts</span>
                </div>
              </div>

              {/* Stamps and Badges */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <span className="text-[9px] text-[#5A6B7B] font-bold uppercase tracking-wider block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Earned Stamps & Badges</span>
                <div className="flex gap-3">
                  {[
                    { label: 'First Flier', active: true, emoji: '🎫' },
                    { label: 'Duty Free VIP', active: true, emoji: '🛍️' },
                    { label: 'Lounge Lover', active: false, emoji: '🛋️' }
                  ].map((badge, idx) => (
                    <div 
                      key={idx} 
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border flex-grow text-center transition-all ${
                        badge.active 
                          ? 'bg-white border-[#3FA9F5]/20 shadow-sm' 
                          : 'bg-[#EAF6FD]/30 border-dashed border-[#3FA9F5]/10 opacity-50'
                      }`}
                    >
                      <span className="text-xl">{badge.emoji}</span>
                      <span className="text-[9px] font-bold text-[#0B3D66] leading-none whitespace-nowrap">{badge.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Duty-free Coupons List */}
            <div className="lg:col-span-7 space-y-4">
              <h4 className="text-sm font-bold text-[#0B3D66] uppercase tracking-widest font-mono">Exclusive Partner Coupons</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { brand: 'SHINSEGAE', desc: '15% Off everything at Departure duty-free stores.', discount: '15% OFF', theme: '#3FA9F5', bg: '#EAF6FD' },
                  { brand: 'THE SHILLA', desc: '10% Off cosmetics, alcohol & fragrance purchases.', discount: '10% OFF', theme: '#3FA9F5', bg: '#EAF6FD' },
                  { brand: 'HYUNDAI', desc: '15% Off luxury fashion, watch & bags.', discount: '15% OFF', theme: '#3FA9F5', bg: '#EAF6FD' },
                  { brand: 'K BOOKS', desc: '10% Off all Korean travel journals & novels.', discount: '10% OFF', theme: '#3FA9F5', bg: '#EAF6FD' }
                ].map((item, idx) => {
                  const isClaimed = claimedCoupons[idx];
                  return (
                    <div 
                      key={idx} 
                      className="card p-4.5 flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden bg-white" 
                      style={{ minHeight: '140px', border: '1px solid rgba(11,61,102,0.08)' }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-extrabold text-[#5A6B7B] tracking-wider block" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{item.brand}</span>
                          <p className="text-xs text-[#5A6B7B] mt-1.5 leading-snug font-semibold">{item.desc}</p>
                        </div>
                        <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide shrink-0 font-mono" style={{ color: '#0B3D66', background: '#EAF6FD' }}>
                          {item.discount}
                        </span>
                      </div>
                      <button 
                        onClick={() => setClaimedCoupons(prev => ({ ...prev, [idx]: true }))}
                        className={`w-full py-2.5 px-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all flex items-center justify-center gap-1.5 mt-4 ${
                          isClaimed 
                            ? 'bg-[#E6FAF0] border-[#34C77B]/20 text-[#34C77B]' 
                            : 'bg-[#EAF6FD] hover:bg-[#D5EBFD] border-[#3FA9F5]/20 text-[#0B3D66]'
                        }`}
                      >
                        {isClaimed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C77B]" /> Coupon Downloaded
                          </>
                        ) : (
                          <>
                            <Ticket className="w-3.5 h-3.5" /> Claim Coupon
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
