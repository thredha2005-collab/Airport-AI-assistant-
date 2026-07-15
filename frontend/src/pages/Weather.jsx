import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Cloud, CloudRain, Sun, CloudFog, Droplets, Wind, Eye, RefreshCw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Weather() {
  const navigate = useNavigate();
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [c, f] = await Promise.all([
        axios.get('http://127.0.0.1:8000/weather/current'),
        axios.get('http://127.0.0.1:8000/weather/forecast')
      ]);
      setWeather(c.data);
      setForecast(f.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Weather configurations (Section 6)
  const getWeatherConfig = (condition) => {
    const s = condition?.toLowerCase() || '';
    if (s.includes('rain') || s.includes('storm')) {
      return {
        icon: <CloudRain className="w-20 h-20 text-[#3FA9F5]" />,
        label: 'Rain',
        recommendation: 'Light rain expected — consider leaving 20 minutes earlier.'
      };
    }
    if (s.includes('fog') || s.includes('mist')) {
      return {
        icon: <CloudFog className="w-20 h-20 text-[#5A6B7B]" />,
        label: 'Fog',
        recommendation: 'Foggy conditions — expect slower operations, leave 15 minutes earlier.'
      };
    }
    if (s.includes('cloud')) {
      return {
        icon: <Cloud className="w-20 h-20 text-[#5A6B7B]" />,
        label: 'Cloudy',
        recommendation: 'Cloudy conditions. Airport operations running normally.'
      };
    }
    return {
      icon: <Sun className="w-20 h-20 text-[#3FA9F5]" />,
      label: 'Clear',
      recommendation: 'Clear sky — normal operations. Arrive 2 hours before departure.'
    };
  };

  const getForecastIcon = (condition) => {
    const s = condition?.toLowerCase() || '';
    if (s.includes('rain') || s.includes('storm')) return <CloudRain className="w-8 h-8 text-[#3FA9F5]" />;
    if (s.includes('fog') || s.includes('mist')) return <CloudFog className="w-8 h-8 text-[#5A6B7B]" />;
    if (s.includes('cloud')) return <Cloud className="w-8 h-8 text-[#5A6B7B]" />;
    return <Sun className="w-8 h-8 text-[#3FA9F5]" />;
  };

  const wConfig = weather ? getWeatherConfig(weather.condition) : null;

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
            <h2 className="text-2xl font-extrabold text-[#0B3D66]" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Airport Weather</h2>
            <p className="text-xs text-[#5A6B7B] mt-0.5">Live conditions and travel advisories</p>
          </div>
        </div>
        <button onClick={load} className="btn-soft flex items-center gap-2 py-2 px-4 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading && !weather ? (
        <div className="text-center py-20">
          <RefreshCw className="w-8 h-8 text-[#3FA9F5] animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-[#5A6B7B]">Loading weather conditions...</p>
        </div>
      ) : weather && (
        <>
          {/* Main Weather Card (Section 6 compliant) */}
          <div 
            className="card-static p-8 flex flex-col md:flex-row items-center justify-between gap-8 bg-white" 
            style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}
          >
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {wConfig.icon}
              <div className="text-center sm:text-left">
                <span className="text-[10px] text-[#5A6B7B] font-bold uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Current Weather</span>
                <p className="text-6xl font-black text-[#0B3D66] mt-2 font-mono" style={{ fontSize: '64px' }}>{weather.temperature_c}°C</p>
                <p className="text-lg font-extrabold text-[#3FA9F5] capitalize mt-1">{wConfig.label}</p>
              </div>
            </div>

            {/* Travel Recommendation Banner */}
            <div className="flex-1 md:max-w-md p-5 bg-[#EAF6FD] rounded-xl border border-[#3FA9F5]/10 flex flex-col justify-center">
              <span className="text-[9px] text-[#3FA9F5] font-bold uppercase tracking-widest" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Advisory & Recommendation</span>
              <p className="text-sm font-extrabold text-[#0B3D66] mt-2 leading-relaxed">
                {wConfig.recommendation}
              </p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Droplets, label: 'Precipitation', val: `${weather.precipitation_mm} mm`, color: '#3FA9F5' },
              { icon: Wind, label: 'Wind Speed', val: `${weather.wind_speed_kmph} km/h`, color: '#5A6B7B' },
              { icon: Eye, label: 'Visibility', val: `${weather.visibility_km} km`, color: '#34C77B' }
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div 
                  key={idx} 
                  className="card-static p-4 text-center bg-white" 
                  style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}
                >
                  <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: stat.color }} />
                  <p className="text-[9px] text-[#5A6B7B] font-bold uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{stat.label}</p>
                  <p className="text-base font-extrabold text-[#0B3D66] mt-1 font-mono">{stat.val}</p>
                </div>
              );
            })}
          </div>

          {/* Forecast Grid */}
          <div>
            <h3 className="text-sm font-bold text-[#0B3D66] uppercase tracking-wider font-mono mb-4">12-Hour Forecast</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {forecast.slice(0, 6).map((f, i) => {
                const t = new Date(f.timestamp);
                const condInfo = getWeatherConfig(f.condition);
                return (
                  <div 
                    key={i} 
                    className="card p-4 text-center bg-white"
                    style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}
                  >
                    <p className="text-[9px] text-[#5A6B7B] font-bold" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex justify-center py-3">
                      {getForecastIcon(f.condition)}
                    </div>
                    <p className="text-base font-extrabold text-[#0B3D66] font-mono">{Math.round(f.temperature_c)}°C</p>
                    <p className="text-[10px] text-[#3FA9F5] font-bold mt-1">{condInfo.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
