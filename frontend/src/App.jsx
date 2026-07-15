import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Home from './pages/Home';
import Login from './pages/Login';
import Flights from './pages/Flights';
import Facilities from './pages/Facilities';
import Parking from './pages/Parking';
import Directions from './pages/Directions';
import ChatbotPage from './pages/ChatbotPage';
import Weather from './pages/Weather';
import PassengerPortal from './pages/PassengerPortal';
import Dashboard from './pages/Dashboard';
import Transport from './pages/Transport';
import {
  Plane, User, Compass, LogOut, Cloud, Sun, CloudRain, CloudFog,
  Home as HomeIcon, MessageSquare, Car, ShoppingBag
} from 'lucide-react';

function AppContent({ auth, setAuth, handleLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isLogin = location.pathname === '/login';

  const [demoStatus, setDemoStatus] = useState({ scenario_id: 'reset', scenario_name: 'normal_day', current_time: new Date().toISOString() });
  const [currentWeather, setCurrentWeather] = useState({ temperature_c: 28, condition: 'Clear' });

  useEffect(() => {
    async function loadData() {
      try {
        const [demoRes, weatherRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/demo/status'),
          axios.get('http://127.0.0.1:8000/weather/current')
        ]);
        setDemoStatus(demoRes.data);
        setCurrentWeather(weatherRes.data);
      } catch (err) { console.error(err); }
    }
    loadData();
  }, [location.pathname]);

  const handleLoadScenario = async (scenarioId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/demo/load-scenario/${scenarioId}`);
      window.location.reload();
    } catch (err) { console.error(err); }
  };

  const formatTime = (iso) => {
    if (!iso) return '--:--';
    try { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }
    catch { return '--:--'; }
  };

  const getWeatherIcon = (c) => {
    const cond = c?.toUpperCase() || '';
    if (cond.includes('RAIN') || cond.includes('STORM')) return <CloudRain className="w-5 h-5 text-[#3FA9F5]" />;
    if (cond.includes('FOG') || cond.includes('MIST')) return <CloudFog className="w-5 h-5 text-[#5A6B7B]" />;
    if (cond.includes('CLOUD')) return <Cloud className="w-5 h-5 text-[#5A6B7B]" />;
    return <Sun className="w-5 h-5 text-[#3FA9F5]" />;
  };

  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Home' },
    { path: '/flights', icon: Plane, label: 'Flights' },
    { path: '/directions', icon: Compass, label: 'Map' },
    { path: '/facilities', icon: ShoppingBag, label: 'Services' },
    { path: '/parking', icon: Car, label: 'Parking' },
    { path: '/weather', icon: Sun, label: 'Weather' },
    { path: '/chatbot', icon: MessageSquare, label: 'Chat' },
  ];

  if (isDashboard || isLogin) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: '#EAF6FD' }}>
        <main className="flex-grow flex flex-col">
          <Routes>
            <Route path="/login" element={auth.isAuthenticated ? (auth.role === 'passenger' ? <Navigate to="/passenger-portal" /> : <Navigate to="/dashboard" />) : <Login setAuth={setAuth} />} />
            <Route path="/dashboard/*" element={auth.isAuthenticated && (auth.role === 'staff' || auth.role === 'admin') ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#EAF6FD' }}>
      
      {/* 1. Thin presentation Demo Mode Banner at the very top (Section 10) */}
      <div className="bg-[#0B3D66] border-b border-white/5 py-1.5 px-6 shrink-0" style={{ height: '32px' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[10px] font-bold uppercase text-slate-300 tracking-wider">
          <span>Presentation Mode</span>
          <div className="flex gap-5">
            {[
              { id: 'evening_rush', label: 'Evening Rush' },
              { id: 'weather_delay', label: 'Weather Delay' },
              { id: 'calm_morning', label: 'Calm Baseline' }
            ].map(s => {
              const isSel = demoStatus.scenario_id === s.id || (s.id === 'calm_morning' && demoStatus.scenario_id === 'reset');
              return (
                <button
                  key={s.id}
                  onClick={() => handleLoadScenario(s.id)}
                  className={`bg-transparent border-none cursor-pointer text-[10px] font-bold tracking-wider hover:text-white uppercase transition-all ${
                    isSel ? 'text-[#3FA9F5] underline' : 'text-slate-400'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Top Header Bar - Fixed navbar height 72px (Section 9) */}
      <header className="sticky top-0 z-50 px-5 bg-white border-b border-slate-200/60 flex items-center shadow-sm shrink-0" style={{ height: '72px' }}>
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 text-inherit no-underline">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #3FA9F5, #0B3D66)' }}>
              <Plane className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-[15px] text-[#0B3D66] tracking-tight leading-none">SkyGuide</span>
              <span className="text-[9px] text-[#5A6B7B] font-bold tracking-wide leading-none mt-0.5 uppercase">Airport Companion</span>
            </div>
          </Link>

          {/* Right Area: Weather + Time + User */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0B3D66]">
              {getWeatherIcon(currentWeather.condition)}
              <span>{Math.round(currentWeather.temperature_c)}°</span>
            </div>
            <div className="text-sm font-extrabold text-[#0B3D66] font-mono">
              {formatTime(demoStatus.current_time)}
            </div>
            <button
              onClick={() => auth.isAuthenticated ? (auth.role === 'passenger' ? navigate('/passenger-portal') : navigate('/dashboard')) : navigate('/login')}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EAF6FD] text-[#0B3D66] hover:bg-[#D5EBFD] cursor-pointer border-none transition-all"
            >
              <User className="w-4 h-4" />
            </button>
            {auth.isAuthenticated && (
              <button onClick={handleLogout} className="p-1.5 text-[#5A6B7B] hover:text-[#D14B3D] bg-transparent border-none cursor-pointer transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Content Wrapper */}
      <div className="flex-grow flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex flex-grow">
          {/* Desktop Left Side Navigation (Section 9 consistent icons sizes) */}
          <aside className="hidden lg:flex flex-col items-center py-6 gap-2 w-20 shrink-0 select-none">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{ borderRadius: '12px' }}
                >
                  {/* Nav icons sized consistently at 24px (Section 9) */}
                  <Icon className="w-6 h-6 p-0.5" />
                  <span className="text-[9px] font-bold uppercase tracking-wider">{item.label}</span>
                </Link>
              );
            })}
          </aside>

          {/* Page Content Viewport */}
          <main className="flex-grow flex flex-col pb-24 lg:pb-6 px-4 lg:px-0 lg:pr-6">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/flights" element={<Flights />} />
              <Route path="/facilities" element={<Facilities />} />
              <Route path="/parking" element={<Parking />} />
              <Route path="/directions" element={<Directions />} />
              <Route path="/chatbot" element={<ChatbotPage />} />
              <Route path="/weather" element={<Weather />} />
              <Route path="/transport" element={<Transport />} />
              <Route path="/passenger-portal" element={auth.isAuthenticated && auth.role === 'passenger' ? <PassengerPortal auth={auth} logout={handleLogout} /> : <Navigate to="/login" />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>

      {/* 4. Production Footer (Section 10) */}
      <footer className="bg-[#0B3D66] text-white py-8 px-6 mt-auto shrink-0 border-t border-white/5 pb-24 lg:pb-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#3FA9F5] flex items-center justify-center text-white">
                <Plane className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm tracking-tight">SkyGuide</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xs">
              Your personalized digital airport transit assistant for Terminal 2 departures, arrivals, parking, and transit navigation.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#3FA9F5]">Quick Services</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <Link to="/flights" className="hover:text-white transition-colors no-underline">Flight Board</Link>
              <Link to="/parking" className="hover:text-white transition-colors no-underline">Smart Parking</Link>
              <Link to="/facilities" className="hover:text-white transition-colors no-underline">Facilities Directory</Link>
              <Link to="/directions" className="hover:text-white transition-colors no-underline">Gate Maps</Link>
              <Link to="/weather" className="hover:text-white transition-colors no-underline">Weather Hub</Link>
              <Link to="/chatbot" className="hover:text-white transition-colors no-underline font-bold text-[#3FA9F5]">SkyGuide Chat</Link>
            </div>
          </div>
          <div className="space-y-2 text-xs text-slate-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#3FA9F5]">Airport Operations</h4>
            <p>Incheon International Airport Terminal 2 (ICN)</p>
            <p>© 2026 Incheon International Airport Corp. All rights reserved.</p>
            <p className="text-[10px] text-slate-400">Design v3 · High-contrast Accessibility Enabled</p>
          </div>
        </div>
      </footer>

      {/* 5. Mobile Bottom Navigation Bar (Section 9) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 flex items-center justify-around py-2 px-2" style={{ boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
        {navItems.slice(0, 5).map(item => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl no-underline transition-all ${
                isActive ? 'text-[#3FA9F5] font-bold' : 'text-[#5A6B7B]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState({ isAuthenticated: false, role: '', name: '', passengerId: null, pnr: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const name = localStorage.getItem('name');
    const passengerId = localStorage.getItem('passenger_id');
    const pnr = localStorage.getItem('pnr');
    if (token) setAuth({ isAuthenticated: true, role: role || '', name: name || '', passengerId: passengerId || null, pnr: pnr || null });
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setAuth({ isAuthenticated: false, role: '', name: '', passengerId: null, pnr: null });
  };

  return (
    <Router>
      <AppContent auth={auth} setAuth={setAuth} handleLogout={handleLogout} />
    </Router>
  );
}
