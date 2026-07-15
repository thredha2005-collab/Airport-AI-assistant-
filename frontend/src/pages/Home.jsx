import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { Plane, Award, User, Compass, Car, Cloud, CloudRain, Sun, CloudFog } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [activeScenario, setActiveScenario] = useState('reset');
  const [weather, setWeather] = useState({ temperature_c: 28, condition: 'Clear' });
  const [auth, setAuth] = useState({ isAuthenticated: false, name: '' });

  useEffect(() => {
    async function load() {
      try {
        const [statusRes, weatherRes] = await Promise.all([
          axios.get('http://127.0.0.1:8000/demo/status'),
          axios.get('http://127.0.0.1:8000/weather/current')
        ]);
        setActiveScenario(statusRes.data.scenario_id);
        setWeather(weatherRes.data);
      } catch (err) { console.error(err); }
    }
    load();

    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');
    if (token) setAuth({ isAuthenticated: true, name: name || 'Passenger' });
  }, []);

  // Determine On-Time percentage based on active scenario
  const getOnTimePercentage = () => {
    if (activeScenario === 'weather_delay') return '68.4%';
    if (activeScenario === 'evening_rush') return '89.1%';
    return '95.8%';
  };

  const getOnTimeStatus = () => {
    if (activeScenario === 'weather_delay') return { text: 'Delays Active', class: 'status-red' };
    if (activeScenario === 'evening_rush') return { text: 'Minor Congest', class: 'status-amber' };
    return { text: 'Normal', class: 'status-green' };
  };

  // Weather configuration (Section 6)
  const getWeatherInfo = () => {
    const cond = weather.condition?.toLowerCase() || '';
    if (cond.includes('rain') || cond.includes('storm')) {
      return {
        icon: <CloudRain className="w-12 h-12 text-[#3FA9F5]" />,
        text: 'Rain',
        rec: 'Light rain expected — consider leaving 20 minutes earlier.'
      };
    }
    if (cond.includes('fog') || cond.includes('mist')) {
      return {
        icon: <CloudFog className="w-12 h-12 text-[#5A6B7B]" />,
        text: 'Fog',
        rec: 'Foggy conditions — expect minor delays, leave 15 mins earlier.'
      };
    }
    if (cond.includes('cloud')) {
      return {
        icon: <Cloud className="w-12 h-12 text-[#5A6B7B]" />,
        text: 'Cloudy',
        rec: 'Cloudy sky — normal flight schedules in operation.'
      };
    }
    return {
      icon: <Sun className="w-12 h-12 text-[#3FA9F5]" />,
      text: 'Clear',
      rec: 'Clear weather. Normal operations. Arrive 2 hours prior.'
    };
  };

  const wInfo = getWeatherInfo();

  return (
    <div className="flex flex-col gap-6 py-6 animate-fade-in">
      
      {/* Title & Brand Intro */}
      <div className="text-left pb-4 border-b border-slate-100">
        <h1 className="text-2xl font-extrabold text-[#0B3D66]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Incheon Airport Companion
        </h1>
        <p className="text-sm text-[#5A6B7B] mt-1">
          Simplify your transit experience with live updates, directions, and smart services.
        </p>
      </div>

      {/* Main 5-Card Responsive Grid (Section 1 & Section 9 Alignment) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-stretch">
        
        {/* Card 1: On-Time Departures */}
        <div className="card-static p-6 flex flex-col justify-between" style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}>
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#EAF6FD] flex items-center justify-center text-[#3FA9F5] mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#5A6B7B] uppercase tracking-wider">On-Time departures</h3>
            <p className="text-3xl font-extrabold text-[#0B3D66] mt-2 font-mono">{getOnTimePercentage()}</p>
          </div>
          <div className="mt-4">
            <span className={`status-pill ${getOnTimeStatus().class}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                getOnTimeStatus().class === 'status-red' ? 'bg-[#D14B3D]' : 
                getOnTimeStatus().class === 'status-amber' ? 'bg-[#F2A93B]' : 'bg-[#34C77B]'
              }`} />
              {getOnTimeStatus().text}
            </span>
          </div>
        </div>

        {/* Card 2: Weather Display (Section 6) */}
        <div className="card-static p-6 flex flex-col justify-between" style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              {wInfo.icon}
              <p className="text-2xl font-extrabold text-[#0B3D66] font-mono">{Math.round(weather.temperature_c)}°C</p>
            </div>
            <h3 className="text-xs font-bold text-[#5A6B7B] uppercase tracking-wider">Airport Weather</h3>
            <p className="text-sm font-bold text-[#0B3D66] mt-1">{wInfo.text}</p>
          </div>
          <p className="text-[10px] text-[#5A6B7B] font-semibold leading-normal mt-4">
            {wInfo.rec}
          </p>
        </div>

        {/* Card 3: Passenger Portal */}
        <Link 
          to={auth.isAuthenticated ? "/passenger-portal" : "/login"} 
          className="card p-6 flex flex-col justify-between no-underline group" 
          style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#EAF6FD] flex items-center justify-center text-[#3FA9F5] group-hover:scale-105 transition-transform mb-4">
              <User className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#5A6B7B] uppercase tracking-wider">Passenger Portal</h3>
            <p className="text-[11px] text-[#5A6B7B] leading-normal mt-2">
              Sign in with PNR reference to view personalized flight status and predictions.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#3FA9F5] group-hover:text-[#0B3D66] transition-colors">
            {auth.isAuthenticated ? "Go to Portal" : "Sign In Now"} ➔
          </div>
        </Link>

        {/* Card 4: Facilities Map */}
        <Link 
          to="/directions" 
          className="card p-6 flex flex-col justify-between no-underline group" 
          style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#EAF6FD] flex items-center justify-center text-[#3FA9F5] group-hover:scale-105 transition-transform mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#5A6B7B] uppercase tracking-wider">Facilities Map</h3>
            <p className="text-[11px] text-[#5A6B7B] leading-normal mt-2">
              Explore shops, lounges, and get step-by-step gate directions.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#3FA9F5] group-hover:text-[#0B3D66] transition-colors">
            View Terminal Map ➔
          </div>
        </Link>

        {/* Card 5: Smart Parking */}
        <Link 
          to="/parking" 
          className="card p-6 flex flex-col justify-between no-underline group" 
          style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-[#EAF6FD] flex items-center justify-center text-[#3FA9F5] group-hover:scale-105 transition-transform mb-4">
              <Car className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-[#5A6B7B] uppercase tracking-wider">Smart Parking</h3>
            <p className="text-[11px] text-[#5A6B7B] leading-normal mt-2">
              Check vacant spots and locate your vehicle dynamically.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-1 text-[11px] font-bold text-[#3FA9F5] group-hover:text-[#0B3D66] transition-colors">
            Check Spaces ➔
          </div>
        </Link>

      </div>
    </div>
  );
}
