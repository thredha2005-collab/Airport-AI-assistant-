import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sliders, RefreshCw, Key, ChevronDown, ChevronUp, AlertCircle, AlertTriangle } from 'lucide-react';

export default function DemoPanel({ setAuth, auth }) {
  const [isOpen, setIsOpen] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [activeScenario, setActiveScenario] = useState('reset');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    async function fetchManifest() {
      try {
        const res = await axios.get('http://127.0.0.1:8000/demo/manifest');
        setManifest(res.data.demo_mode);
      } catch (err) {
        console.error("Could not fetch demo manifest:", err);
      }
    }
    fetchManifest();
  }, []);

  const handleLoadScenario = async (scenarioId) => {
    setLoading(true);
    setStatusMsg('');
    try {
      const res = await axios.post(`http://127.0.0.1:8000/demo/load-scenario/${scenarioId}`);
      setActiveScenario(scenarioId);
      setStatusMsg(res.data.message);
    } catch (err) {
      console.error(err);
      setStatusMsg("Error loading scenario.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (roleType) => {
    if (!manifest) return;
    setLoading(true);
    setStatusMsg('');

    let loginUser = '';
    let loginPass = '';

    if (roleType === 'passenger') {
      loginUser = manifest.demo_accounts.passenger_quick_login.pnr;
      loginPass = manifest.demo_accounts.passenger_quick_login.last_name;
    } else if (roleType === 'staff') {
      loginUser = manifest.demo_accounts.staff_quick_login.username;
      loginPass = manifest.demo_accounts.staff_quick_login.password;
    } else {
      loginUser = manifest.demo_accounts.admin_quick_login.username;
      loginPass = manifest.demo_accounts.admin_quick_login.password;
    }

    try {
      const res = await axios.post('http://127.0.0.1:8000/auth/login', {
        username: loginUser,
        password: loginPass
      });
      
      const data = res.data;
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('name', data.full_name);
      if (data.passenger_id) {
        localStorage.setItem('passenger_id', data.passenger_id);
        localStorage.setItem('pnr', loginUser);
      }

      setAuth({
        isAuthenticated: true,
        role: data.role,
        name: data.full_name,
        passengerId: data.passenger_id,
        pnr: data.passenger_id ? loginUser : null
      });

      setStatusMsg(`Logged in as ${data.full_name} (${data.role})!`);
    } catch (err) {
      console.error(err);
      setStatusMsg("Quick login failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!manifest) return null;

  return (
    <div className="w-full bg-[#0B1E33] border-b border-cyan-500/20 text-xs font-sans">
      {/* Combined Single Row Ribbon */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#0B1E33] text-[10px] text-[#F2A93B] py-2 px-6 font-bold tracking-widest uppercase flex items-center justify-between cursor-pointer hover:bg-slate-900/30 transition-all select-none"
        style={{ letterSpacing: '0.05em' }}
      >
        <div className="w-6 h-6 hidden sm:block" />

        <div className="flex items-center gap-1.5 mx-auto">
          <AlertTriangle className="w-3.5 h-3.5 text-[#F2A93B]" />
          <span>DEMO MODE — SAMPLE OPERATIONS DATA</span>
          <span className="text-slate-400 font-mono text-[9px] lowercase tracking-normal font-normal ml-2">
            ({activeScenario === 'reset' ? 'baseline time' : `active scenario: ${activeScenario}`})
          </span>
        </div>

        <button 
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
          className="p-1 text-[#F2A93B] hover:text-white bg-transparent border-none cursor-pointer focus-ring rounded"
          aria-label={isOpen ? "Collapse Demo panel" : "Expand Demo panel"}
        >
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded panel body */}
      {isOpen && (
        <div className="bg-[#0f253e] p-6 border-t border-[#112d4d]">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Column 1: Curated Scenarios */}
            <div className="md:col-span-2 space-y-4">
              <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-2 font-mono">Curated Demo Scenarios</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {manifest.scenarios.map((sc) => {
                  const isActive = activeScenario === sc.id;
                  return (
                    <div 
                      key={sc.id}
                      onClick={() => handleLoadScenario(sc.id)}
                      className={`p-4 interactive-card text-left cursor-pointer transition-all ${
                        isActive 
                          ? 'border-cyan-400 bg-cyan-950/20 shadow' 
                          : 'border-slate-800 bg-[#0B1E33] hover:bg-slate-900'
                      }`}
                      style={{
                        borderColor: isActive ? '#16807F' : ''
                      }}
                    >
                      <h5 className="font-bold text-slate-200 text-xs mb-1.5">{sc.label}</h5>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-light">{sc.description}</p>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => handleLoadScenario('reset')}
                  className="text-slate-400 hover:text-slate-200 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded px-3 py-1.5 cursor-pointer font-bold uppercase tracking-wider text-[10px]"
                >
                  Reset Demo Time
                </button>
                {statusMsg && (
                  <span className="text-cyan-400 font-bold font-mono flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {statusMsg}
                  </span>
                )}
              </div>
            </div>

            {/* Column 2: One-Click Quick Logins */}
            <div className="border-t md:border-t-0 md:border-l border-[#112d4d] pl-0 md:pl-8 space-y-4">
              <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px] mb-2 font-mono">One-Click Quick Logins</h4>
              <div className="space-y-2">
                <button
                  disabled={loading}
                  onClick={() => handleQuickLogin('passenger')}
                  className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-md cursor-pointer text-left text-slate-300 font-bold uppercase tracking-wide text-[10px]"
                >
                  <span>Passenger Login</span>
                  <Key className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleQuickLogin('staff')}
                  className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-md cursor-pointer text-left text-slate-300 font-bold uppercase tracking-wide text-[10px]"
                >
                  <span>Staff Login</span>
                  <Key className="w-4 h-4 text-cyan-400" />
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleQuickLogin('admin')}
                  className="w-full flex items-center justify-between p-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-md cursor-pointer text-left text-slate-300 font-bold uppercase tracking-wide text-[10px]"
                >
                  <span>Admin Login</span>
                  <Key className="w-4 h-4 text-cyan-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
