import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Search, Star, Clock, MapPin, Coffee, ShoppingBag, Landmark, Heart, Eye, AlertTriangle, RefreshCw } from 'lucide-react';

export default function Facilities() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch facilities from the actual backend endpoint (Section 5)
  const fetchFacilities = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get('http://127.0.0.1:8000/facilities');
      setFacilities(res.data);
    } catch (err) {
      console.error(err);
      setError("Couldn't load facilities right now — please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  // Category mapping: Label to backend CSV category (Section 5 categories)
  const categories = [
    { label: 'All', key: 'All' },
    { label: 'Lounges', key: 'lounge' },
    { label: 'Cafes', key: 'cafe' },
    { label: 'Gift Shops', key: 'gift_shop' },
    { label: 'Restrooms', key: 'restroom' },
    { label: 'ATMs', key: 'atm' },
    { label: 'Medical', key: 'medical' },
    { label: 'Prayer Rooms', key: 'prayer_room' }
  ];

  // Dynamically calculate distance and walk time based on coordinates from reference point (150, 150)
  const getWalkInfo = (fac) => {
    const refX = 150;
    const refY = 150;
    const dx = fac.x_coordinate - refX;
    const dy = fac.y_coordinate - refY;
    const distance = Math.round(Math.sqrt(dx * dx + dy * dy) * 1.5);
    const walkTime = Math.max(1, Math.round(distance / 70)); // 70m per min average walking
    return { distance, walkTime };
  };

  // Get Lucide Icon for categories
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'lounge':
        return <Star className="w-5 h-5 text-[#3FA9F5]" />;
      case 'cafe':
        return <Coffee className="w-5 h-5 text-[#3FA9F5]" />;
      case 'gift_shop':
        return <ShoppingBag className="w-5 h-5 text-[#3FA9F5]" />;
      case 'atm':
        return <Landmark className="w-5 h-5 text-[#3FA9F5]" />;
      case 'medical':
        return <Heart className="w-5 h-5 text-[#3FA9F5]" />;
      default:
        return <MapPin className="w-5 h-5 text-[#3FA9F5]" />;
    }
  };

  // Filter logic
  const filtered = facilities.filter(f => {
    // Matches search name or location
    const matchSearch = f.facility_name.toLowerCase().includes(search.toLowerCase()) || 
                        f.terminal.toLowerCase().includes(search.toLowerCase());
    
    // Matches category
    const matchCat = activeCategory === 'All' || f.category === activeCategory;
    
    return matchSearch && matchCat;
  });

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in text-[#0B3D66]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#0B3D66] hover:text-[#3FA9F5] hover:border-[#3FA9F5] cursor-pointer transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-extrabold text-[#0B3D66]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Airport Directory</h2>
            <p className="text-xs text-[#5A6B7B] mt-0.5">Find lounges, cafes, restrooms, and services in Terminal 2</p>
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          value={search} 
          onChange={e => setSearch(e.target.value)} 
          placeholder="Search for facilities (e.g. Lounge, Restroom, Terminal 2)..." 
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-base outline-none text-[#0B3D66] font-medium placeholder-slate-400 focus:border-[#3FA9F5]" 
          style={{ minHeight: '48px' }}
        />
      </div>

      {/* Categories Filter Strip */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 select-none">
        {categories.map(c => (
          <button 
            key={c.key} 
            onClick={() => setActiveCategory(c.key)} 
            className={`py-2 px-4 rounded-xl text-xs font-bold border cursor-pointer transition-all whitespace-nowrap ${
              activeCategory === c.key 
                ? 'text-white border-[#0B3D66] bg-[#0B3D66]' 
                : 'bg-white text-[#5A6B7B] border-slate-200 hover:border-[#3FA9F5] hover:text-[#3FA9F5]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Grid of Results */}
      {loading ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 text-[#3FA9F5] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#5A6B7B]">Loading terminal directory...</p>
        </div>
      ) : error ? (
        <div className="card p-8 text-center text-[#D14B3D]" style={{ borderRadius: '12px', border: '1px solid rgba(209,75,61,0.2)' }}>
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-[#D14B3D]" />
          <p className="text-base font-extrabold">{error}</p>
          <button onClick={fetchFacilities} className="btn-primary mt-4 py-2 px-5 text-xs">Retry Loading</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-[#5A6B7B]" style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}>
          <Search className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-extrabold">No results for that search</p>
          <p className="text-xs text-slate-400 mt-1">Try refining your keyword or clearing filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(f => {
            const { distance, walkTime } = getWalkInfo(f);
            
            return (
              <div 
                key={f.facility_id} 
                className="card p-5 flex items-start gap-4 hover:shadow-md transition-all bg-white"
                style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}
              >
                {/* Icon Wrapper */}
                <div className="w-12 h-12 rounded-xl bg-[#EAF6FD] flex items-center justify-center shrink-0">
                  {getCategoryIcon(f.category)}
                </div>
                
                {/* Facility Details */}
                <div className="min-w-0 flex-grow">
                  <h4 className="font-extrabold text-sm text-[#0B3D66] truncate">{f.facility_name}</h4>
                  
                  {/* Category Mapped Name */}
                  <span className="text-[10px] font-bold text-[#3FA9F5] bg-[#EAF6FD] px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mt-1 font-mono">
                    {f.category.replace('_', ' ')}
                  </span>
                  
                  {/* Location Details (Terminal & Floor - Section 5) */}
                  <p className="text-xs text-[#5A6B7B] mt-2 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#3FA9F5] shrink-0" />
                    Terminal {f.terminal.replace('T', '')} · Level {f.floor}F
                  </p>
                  
                  {/* Walking distance & time from ref (Section 5) */}
                  <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-[#5A6B7B] font-bold uppercase tracking-wider font-mono">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#3FA9F5]" /> {walkTime} min</span>
                    <span>·</span>
                    <span>{distance} meters</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
