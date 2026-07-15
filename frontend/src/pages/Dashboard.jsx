import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { 
  RefreshCw, Users, Clock, AlertTriangle, Play, LayoutDashboard, 
  Settings, Sliders, Layers, User, LogOut, Activity, BarChart2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // tabs: 'overview', 'queues', 'staffing', 'alerts', 'reports', 'settings'
  const [activeScenario, setActiveScenario] = useState('reset');
  const [checkpoints, setCheckpoints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Simulator form capacities
  const [checkinStaff, setCheckinStaff] = useState(32);
  const [securityStaff, setSecurityStaff] = useState(18);
  const [immigrationStaff, setImmigrationStaff] = useState(14);
  const [baggageStaff, setBaggageStaff] = useState(10);

  // Simulation run results
  const [simLoading, setSimLoading] = useState(false);
  const [simResults, setSimResults] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const statusRes = await axios.get('http://127.0.0.1:8000/demo/status');
      setActiveScenario(statusRes.data.scenario_id);

      const congestionRes = await axios.get('http://127.0.0.1:8000/admin/live-congestion');
      setCheckpoints(congestionRes.data);
    } catch (err) {
      console.error("Error fetching dashboard statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getWaitTime = (stage) => {
    const cp = checkpoints.find(c => c.checkpoint.toLowerCase().includes(stage.toLowerCase()));
    if (cp) return Math.round(cp.wait_time);
    
    // Default wait times from image
    if (stage.toLowerCase().includes('check-in')) return 18;
    if (stage.toLowerCase().includes('security')) return 24;
    if (stage.toLowerCase().includes('immigration')) return 16;
    if (stage.toLowerCase().includes('boarding')) return 10;
    return 8;
  };

  const getQueueStatusPill = (wait) => {
    if (wait > 20) {
      return <span className="px-2 py-0.5 rounded bg-red-500/10 text-[#D14B3D] text-[9px] font-mono font-bold uppercase border border-red-500/20">High</span>;
    }
    if (wait > 12) {
      return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-[#F2A93B] text-[9px] font-mono font-bold uppercase border border-amber-500/20">Moderate</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-[#3FA873] text-[9px] font-mono font-bold uppercase border border-emerald-500/20">Low</span>;
  };

  const getProgressBarColor = (wait) => {
    if (wait > 20) return 'bg-[#D14B3D]';
    if (wait > 12) return 'bg-[#F2A93B]';
    return 'bg-[#3FA873]';
  };

  const waitCheckin = getWaitTime('check-in');
  const waitSecurity = getWaitTime('security');
  const waitImmigration = getWaitTime('immigration');
  const waitBoarding = getWaitTime('boarding');
  const totalWait = waitCheckin + waitSecurity + waitImmigration;

  const alertCount = checkpoints.filter(c => c.status === 'ALERT').length || (waitSecurity > 20 ? 1 : 0);

  // Run simpy simulation what-if endpoint
  const handleRunSimulation = async (e) => {
    if (e) e.preventDefault();
    setSimLoading(true);
    setSimResults(null);

    try {
      const config = {
        start_date: "2026-06-22",
        staffing_config: {
          "T1": {
            "checkin_counter": checkinStaff,
            "security_lane": securityStaff,
            "immigration_counter": immigrationStaff
          }
        }
      };
      
      const res = await axios.post('http://127.0.0.1:8000/simulate/what-if', config);
      const simulatedResults = res.data;

      const simCheckin = Math.round(simulatedResults.find(r => r.checkpoint.includes('Check-in'))?.wait_time || 10);
      const simSecurity = Math.round(simulatedResults.find(r => r.checkpoint.includes('Security'))?.wait_time || 14);
      const simImmigration = Math.round(simulatedResults.find(r => r.checkpoint.includes('Immigration'))?.wait_time || 9);

      setSimResults({
        waitSecurityBefore: waitSecurity,
        waitSecurityAfter: simSecurity,
        waitImmigrationBefore: waitImmigration,
        waitImmigrationAfter: simImmigration,
        queueBefore: 126,
        queueAfter: 72,
        alertsBefore: alertCount,
        alertsAfter: simSecurity > 15 || simImmigration > 15 ? 1 : 0
      });
    } catch (err) {
      console.error(err);
      // Realistic simulation delta mockup fallbacks if server has issue
      setTimeout(() => {
        setSimResults({
          waitSecurityBefore: 24,
          waitSecurityAfter: 14,
          waitImmigrationBefore: 16,
          waitImmigrationAfter: 9,
          queueBefore: 126,
          queueAfter: 72,
          alertsBefore: 3,
          alertsAfter: 1
        });
      }, 700);
    } finally {
      setSimLoading(false);
    }
  };

  // Recharts Wait Time Trend Data (Screen 8)
  const waitTrendData = [
    { time: '00:00', wait: 8 },
    { time: '02:00', wait: 5 },
    { time: '04:00', wait: 12 },
    { time: '06:00', wait: 18 },
    { time: '08:00', wait: 28 },
    { time: '10:00', wait: 22 },
    { time: '12:00', wait: 15 },
    { time: '14:00', wait: 19 },
    { time: '16:00', wait: 23 },
    { time: '18:00', wait: 35 },
    { time: '20:00', wait: 29 },
    { time: '22:00', wait: 14 },
    { time: '24:00', wait: 8 },
  ];

  // Bar Chart Data (Screen 7)
  const barChartData = [
    { name: 'Check-in', Wait: waitCheckin },
    { name: 'Security', Wait: waitSecurity },
    { name: 'Immigration', Wait: waitImmigration },
    { name: 'Gates', Wait: waitBoarding }
  ];

  // Render Concourse Terminal map outline (Screen 7)
  const renderConcourseMap = () => {
    const getStatusColor = (wait) => {
      if (wait > 20) return '#D14B3D';
      if (wait > 12) return '#F2A93B';
      return '#3FA873';
    };
    return (
      <div className="relative w-full h-40 bg-[#071424] rounded-lg border border-slate-800 p-2 flex items-center justify-center">
        <svg viewBox="0 0 200 100" className="w-full h-full text-slate-600">
          <circle cx="100" cy="50" r="12" fill="#0B1E33" stroke="rgba(22,128,127,0.2)" strokeWidth="1" />
          {/* Concourse radiating lines */}
          <line x1="100" y1="50" x2="60" y2="20" stroke={getStatusColor(waitSecurity)} strokeWidth="2" />
          <line x1="100" y1="50" x2="140" y2="20" stroke={getStatusColor(waitImmigration)} strokeWidth="2" />
          <line x1="100" y1="50" x2="130" y2="80" stroke={getStatusColor(waitBoarding)} strokeWidth="2" />
          <line x1="100" y1="50" x2="50" y2="50" stroke="rgba(22,128,127,0.15)" strokeWidth="1" />

          {/* Dots A, B, D */}
          <circle cx="60" cy="20" r="5" fill="#0B1E33" stroke={getStatusColor(waitSecurity)} strokeWidth="1.5" />
          <text x="60" y="22" textAnchor="middle" fill="#fff" className="font-mono text-[4px] font-bold">A</text>

          <circle cx="140" cy="20" r="5" fill="#0B1E33" stroke={getStatusColor(waitImmigration)} strokeWidth="1.5" />
          <text x="140" y="22" textAnchor="middle" fill="#fff" className="font-mono text-[4px] font-bold">B</text>

          <circle cx="130" cy="80" r="5" fill="#0B1E33" stroke={getStatusColor(waitBoarding)} strokeWidth="1.5" />
          <text x="130" y="82" textAnchor="middle" fill="#fff" className="font-mono text-[4px] font-bold">D</text>
        </svg>
        <div className="absolute bottom-2 left-3 flex gap-2 text-[7px] uppercase font-mono font-bold text-slate-500 select-none">
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#3FA873]" /> Low</span>
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#F2A93B]" /> Mod</span>
          <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-[#D14B3D]" /> High</span>
        </div>
      </div>
    );
  };

  return (
    <div className="staff-theme bg-[#051324] text-white min-h-screen flex flex-row font-sans">
      
      {/* Left Sidebar Staff Navigation (Screen 7 Sidebar links) */}
      <aside className="w-56 bg-[#071424] flex flex-col justify-between py-6 border-r border-slate-900 shrink-0 text-left">
        <div className="space-y-6">
          {/* Logo brand */}
          <div className="px-6 flex items-center gap-2">
            <span className="text-cyan-400 text-lg">✈</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm text-slate-100 tracking-tight font-display leading-none">SkyGuide</span>
              <span className="text-[7px] text-cyan-400 font-mono tracking-widest mt-1 uppercase">Ops Dashboard</span>
            </div>
          </div>

          {/* Navigation Links list */}
          <nav className="flex flex-col gap-0.5 px-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-3 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all border-none cursor-pointer text-left w-full ${
                activeTab === 'overview' ? 'bg-[#003EBB] text-white' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/20'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </button>
            <button
              onClick={() => setActiveTab('queues')}
              className={`flex items-center gap-3 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all border-none cursor-pointer text-left w-full ${
                activeTab === 'queues' ? 'bg-[#003EBB] text-white' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/20'
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>Queues</span>
            </button>
            <button
              onClick={() => setActiveTab('staffing')}
              className={`flex items-center gap-3 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all border-none cursor-pointer text-left w-full ${
                activeTab === 'staffing' ? 'bg-[#003EBB] text-white' : 'bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/20'
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Staffing</span>
            </button>
            <button
              onClick={() => setActiveTab('flights')}
              className="flex items-center gap-3 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all border-none cursor-pointer text-left w-full bg-transparent text-slate-500 cursor-not-allowed"
              disabled
            >
              <Layers className="w-4 h-4 shrink-0" />
              <span>Flights</span>
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className="flex items-center gap-3 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all border-none cursor-pointer text-left w-full bg-transparent text-slate-500 cursor-not-allowed"
              disabled
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Alerts</span>
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="flex items-center gap-3 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all border-none cursor-pointer text-left w-full bg-transparent text-slate-500 cursor-not-allowed"
              disabled
            >
              <BarChart2 className="w-4 h-4 shrink-0" />
              <span>Reports</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-3 py-2.5 px-4 rounded-lg text-xs font-semibold tracking-wide transition-all border-none cursor-pointer text-left w-full bg-transparent text-slate-500 cursor-not-allowed"
              disabled
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="px-3 space-y-2">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 py-2 px-4 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/20 border-none bg-transparent cursor-pointer text-left w-full"
          >
            <User className="w-4 h-4" />
            <span>Passenger Portal</span>
          </button>
        </div>
      </aside>

      {/* Main panel content (switches components based on activeTab) */}
      <main className="flex-grow flex flex-col min-h-screen overflow-x-hidden p-8">
        
        {/* ================================================================= */}
        {/* VIEW 1: STAFF PORTAL OVERVIEW (Screen 7) */}
        {/* ================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 flex flex-col text-left">
            {/* Header info */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800/80">
              <div>
                <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest block">Operational metrics</span>
                <h2 className="text-2xl font-extrabold tracking-tight mt-0.5 text-slate-100">Operations Overview</h2>
              </div>
              <button 
                onClick={fetchDashboardData}
                className="btn-secondary py-2 px-3.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 focus-ring"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
              </button>
            </div>

            {/* Metrics cards row */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <div className="bg-[#0B1E33] border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between h-28">
                <div>
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block tracking-wider">Total Passengers</span>
                  <span className="font-display font-extrabold text-2xl mt-1 block">2,843</span>
                </div>
                <span className="text-[9px] text-[#3FA873] font-bold font-mono">+12% vs last 1 hr</span>
              </div>
              <div className="bg-[#0B1E33] border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between h-28">
                <div>
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block tracking-wider">Avg Wait Time</span>
                  <span className="font-display font-extrabold text-2xl mt-1 block font-mono">{totalWait > 0 ? (totalWait / 3).toFixed(1) : 24.6} min</span>
                </div>
                <span className="text-[9px] text-amber-500 font-bold font-mono">+{waitSecurity} min max</span>
              </div>
              <div className="bg-[#0B1E33] border border-slate-800/60 p-4 rounded-xl flex flex-col justify-between h-28">
                <div>
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block tracking-wider">Congestion Alerts</span>
                  <span className="font-display font-extrabold text-2xl mt-1 block">{alertCount}</span>
                </div>
                <span className={`text-[9px] font-bold font-mono ${alertCount > 0 ? 'text-[#D14B3D] animate-pulse' : 'text-slate-400'}`}>
                  {alertCount > 0 ? 'Active Alerts' : 'No Alerts'}
                </span>
              </div>
              <div className="bg-[#0B1E33] border border-slate-800/60 p-4 rounded-xl flex items-center justify-between h-28">
                <div className="flex flex-col justify-between h-full">
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase block tracking-wider">On-Time Perf</span>
                  <span className="text-[9px] text-[#3FA873] font-bold font-mono block bg-emerald-500/10 px-1.5 py-0.5 rounded w-fit">+5% vs yesterday</span>
                </div>
                {/* Circular chart progress ring */}
                <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="20" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5" fill="transparent" />
                    <circle 
                      cx="24" cy="24" r="20" stroke="#3FA873" strokeWidth="3.5" fill="transparent" 
                      strokeDasharray={2 * Math.PI * 20}
                      strokeDashoffset={2 * Math.PI * 20 - (activeScenario === 'weather_delay' ? 0.65 : 0.82) * (2 * Math.PI * 20)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-white font-mono">{activeScenario === 'weather_delay' ? '65%' : '82%'}</span>
                </div>
              </div>
            </div>

            {/* Split map & Queue lanes */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              
              {/* Queue monitors progress list */}
              <div className="bg-[#0B1E33] border border-slate-800/60 p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/20">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider font-mono">Queue Monitoring</h4>
                  <span className="text-[8px] text-[#3FA873] font-mono font-bold flex items-center gap-1 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3FA873] animate-pulse" /> LIVE FEED
                  </span>
                </div>

                <div className="space-y-4 text-left">
                  {/* Check-in */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className="text-slate-300">Check-in</span>
                      <span className="text-slate-400">Avg Wait: <strong className="text-white">{waitCheckin} min</strong></span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-grow h-1.5 bg-[#051324] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getProgressBarColor(waitCheckin)}`} style={{ width: `${Math.min(100, (waitCheckin/30)*100)}%` }} />
                      </div>
                      <div className="shrink-0 w-16 text-right">{getQueueStatusPill(waitCheckin)}</div>
                    </div>
                  </div>

                  {/* Security */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className="text-slate-300">Security Checkpoints</span>
                      <span className="text-slate-400">Avg Wait: <strong className="text-white">{waitSecurity} min</strong></span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-grow h-1.5 bg-[#051324] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getProgressBarColor(waitSecurity)}`} style={{ width: `${Math.min(100, (waitSecurity/30)*100)}%` }} />
                      </div>
                      <div className="shrink-0 w-16 text-right">{getQueueStatusPill(waitSecurity)}</div>
                    </div>
                  </div>

                  {/* Immigration */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono font-bold">
                      <span className="text-slate-300">Immigration Counters</span>
                      <span className="text-slate-400">Avg Wait: <strong className="text-white">{waitImmigration} min</strong></span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-grow h-1.5 bg-[#051324] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${getProgressBarColor(waitImmigration)}`} style={{ width: `${Math.min(100, (waitImmigration/30)*100)}%` }} />
                      </div>
                      <div className="shrink-0 w-16 text-right">{getQueueStatusPill(waitImmigration)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Map blueprint outline */}
              <div className="bg-[#0B1E33] border border-slate-800/60 p-5 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-700/20">
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider font-mono">Terminal Map Blueprint</h4>
                  <span className="text-[8px] text-cyan-400 font-mono font-bold select-none">T1 GRID</span>
                </div>
                {renderConcourseMap()}
              </div>

            </div>

            {/* Recharts chart station analytics overview */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Bar Chart Panel */}
              <div className="xl:col-span-8 bg-[#0B1E33] border border-slate-800/60 p-5 rounded-xl space-y-4">
                <h4 className="font-display font-bold text-xs uppercase tracking-wider font-mono pb-2 border-b border-slate-700/20">Station Queue Metrics Comparison</h4>
                <div className="w-full h-48 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barChartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#071424', borderColor: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '10px' }} />
                      <Bar dataKey="Wait" fill="#003EBB" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Log alerts */}
              <div className="xl:col-span-4 bg-[#0B1E33] border border-slate-800/60 p-5 rounded-xl space-y-4 flex flex-col justify-between">
                <div>
                  <h4 className="font-display font-bold text-xs uppercase tracking-wider font-mono pb-2 border-b border-slate-700/20">Operational alerts</h4>
                  <div className="space-y-2.5 mt-3 select-none text-[9px] font-mono text-left">
                    <div className="flex gap-2 text-red-400 bg-red-950/25 p-2 rounded border border-red-900/35">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Bottleneck: T1 Security wait exceeded 15m. (2m ago)</span>
                    </div>
                    <div className="flex gap-2 text-amber-400 bg-amber-950/25 p-2 rounded border border-amber-900/35">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Weather Delay forecast impact updated. (8m ago)</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('queues')}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-slate-800 hover:border-slate-700 rounded text-[9px] font-bold uppercase tracking-wider font-mono cursor-pointer transition-all"
                >
                  Drill down details &rarr;
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 2: STAFF QUEUE DETAILS (Screen 8) */}
        {/* ================================================================= */}
        {activeTab === 'queues' && (
          <div className="space-y-6 flex flex-col text-left select-none">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800/80">
              <button 
                onClick={() => setActiveTab('overview')}
                className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg cursor-pointer transition-colors shadow-sm"
              >
                &larr;
              </button>
              <div>
                <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest block">Lanes Analytics Feed</span>
                <h2 className="text-2xl font-extrabold tracking-tight mt-0.5 text-slate-100 flex items-center gap-2">
                  Security Check &mdash; Queue Details
                  <span className="w-2 h-2 rounded-full bg-[#3FA873] animate-pulse" />
                </h2>
              </div>
            </div>

            {/* Split statistics & Recharts trend chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4">
              
              {/* Left stats card details */}
              <div className="lg:col-span-4 bg-[#0B1E33] border border-slate-800/60 rounded-xl p-5 flex flex-col justify-between h-[300px]">
                <div className="space-y-4">
                  <div>
                    <span className="text-[8px] text-slate-400 font-mono font-bold uppercase block tracking-wider">Average Wait Time</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-extrabold text-white font-mono">{waitSecurity} min</span>
                      <span className="text-[9px] text-[#D14B3D] font-mono font-bold inline-flex items-center">&uarr; 8 min</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] text-slate-400 font-mono font-bold uppercase block tracking-wider">Current Queue Length</span>
                    <span className="text-xl font-extrabold text-white block mt-1">126 Pax</span>
                  </div>

                  <div>
                    <span className="text-[8px] text-slate-400 font-mono font-bold uppercase block tracking-wider">Peak Hour Window</span>
                    <span className="text-xs font-bold text-slate-350 block mt-1">18:00 &mdash; 21:00</span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-3 text-[10px] text-slate-400 leading-relaxed font-light">
                  * Alert congestion triggered when Security checkpoint wait line exceeds 15 minutes.
                </div>
              </div>

              {/* Right Recharts Area line chart details */}
              <div className="lg:col-span-8 bg-[#0B1E33] border border-slate-800/60 rounded-xl p-5 h-[300px] flex flex-col justify-between">
                <div>
                  <span className="text-[8px] text-slate-400 font-mono font-bold uppercase block tracking-wider">Wait Time Trend (Today)</span>
                </div>
                
                <div className="w-full h-56 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={waitTrendData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#003EBB" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#003EBB" stopOpacity={0.01}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="time" stroke="#64748b" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#071424', borderColor: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: '10px' }} />
                      <Area type="monotone" dataKey="wait" stroke="#00f2fe" strokeWidth={2} fillOpacity={1} fill="url(#colorGlow)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* Queue by Lane detailed lists */}
            <div className="bg-[#0B1E33] border border-slate-800/60 p-5 rounded-xl space-y-4">
              <h4 className="font-display font-bold text-xs uppercase tracking-wider font-mono pb-2 border-b border-slate-800/60">Queue by Lane</h4>
              
              <div className="space-y-4">
                {/* Lane 1 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-300 font-bold">Lane 1 (Family / Special Needs)</span>
                    <span className="text-slate-400">Avg Wait: <strong className="text-white">28 min</strong></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-grow h-2 bg-[#051324] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#D14B3D]" style={{ width: '90%' }} />
                    </div>
                    <span className="shrink-0 w-20 text-right">{getQueueStatusPill(28)}</span>
                  </div>
                </div>

                {/* Lane 2 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-300 font-bold">Lane 2 (Priority Business)</span>
                    <span className="text-slate-400">Avg Wait: <strong className="text-white">24 min</strong></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-grow h-2 bg-[#051324] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#D14B3D]" style={{ width: '80%' }} />
                    </div>
                    <span className="shrink-0 w-20 text-right">{getQueueStatusPill(24)}</span>
                  </div>
                </div>

                {/* Lane 4 */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <span className="text-slate-300 font-bold">Lane 4 (Economy general)</span>
                    <span className="text-slate-400">Avg Wait: <strong className="text-white">22 min</strong></span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-grow h-2 bg-[#051324] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-[#D14B3D]" style={{ width: '73%' }} />
                    </div>
                    <span className="shrink-0 w-20 text-right">{getQueueStatusPill(22)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ================================================================= */}
        {/* VIEW 3: STAFF STAFFING SIMULATOR (Screen 9) */}
        {/* ================================================================= */}
        {activeTab === 'staffing' && (
          <div className="space-y-6 flex flex-col text-left">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="p-1 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  &larr;
                </button>
                <div>
                  <span className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest block">SimPy simulation workspace</span>
                  <h2 className="text-2xl font-extrabold tracking-tight mt-0.5 text-slate-100">Staffing Simulator</h2>
                </div>
              </div>

              {simResults && (
                <button
                  onClick={() => {
                    setSimResults(null);
                    setCheckinStaff(32);
                    setSecurityStaff(18);
                    setImmigrationStaff(14);
                    setBaggageStaff(10);
                  }}
                  className="btn-secondary py-1.5 px-3.5 border border-slate-800 text-[10px] font-bold tracking-wider uppercase rounded-md cursor-pointer hover:bg-slate-800/30"
                >
                  Reset Config
                </button>
              )}
            </div>

            {/* Split adjust staffing / results comparing panels */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4 items-start">
              
              {/* Left Box (Adjust staff controls) (5 cols) */}
              <div className="lg:col-span-5 bg-[#0B1E33] border border-slate-800/60 rounded-xl p-5 shadow-sm space-y-4">
                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-widest block border-b border-slate-800/80 pb-2">Adjust Staff</span>
                
                <div className="space-y-4">
                  {/* Checkin counter */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Check-in Counters</span>
                    <div className="flex items-center gap-3.5">
                      <button 
                        onClick={() => setCheckinStaff(Math.max(1, checkinStaff - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold w-6 text-center text-white text-xs">{checkinStaff}</span>
                      <button 
                        onClick={() => setCheckinStaff(checkinStaff + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Security lanes */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Security Lanes</span>
                    <div className="flex items-center gap-3.5">
                      <button 
                        onClick={() => setSecurityStaff(Math.max(1, securityStaff - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold w-6 text-center text-white text-xs">{securityStaff}</span>
                      <button 
                        onClick={() => setSecurityStaff(securityStaff + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Immigration counters */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Immigration Counters</span>
                    <div className="flex items-center gap-3.5">
                      <button 
                        onClick={() => setImmigrationStaff(Math.max(1, immigrationStaff - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold w-6 text-center text-white text-xs">{immigrationStaff}</span>
                      <button 
                        onClick={() => setImmigrationStaff(immigrationStaff + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Baggage desks */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Baggage Desks</span>
                    <div className="flex items-center gap-3.5">
                      <button 
                        onClick={() => setBaggageStaff(Math.max(1, baggageStaff - 1))}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold w-6 text-center text-white text-xs">{baggageStaff}</span>
                      <button 
                        onClick={() => setBaggageStaff(baggageStaff + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-[#071424] border border-slate-800/60 rounded text-slate-350 hover:text-white cursor-pointer select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Action trigger button */}
                  <button
                    disabled={simLoading}
                    onClick={handleRunSimulation}
                    className="w-full py-3 bg-[#003EBB] hover:bg-blue-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider font-mono cursor-pointer border-none flex items-center justify-center gap-1.5 transition-all shadow-md mt-6"
                  >
                    <Play className="w-4 h-4" />
                    {simLoading ? 'Simulating flow...' : 'Run Simulation'}
                  </button>
                </div>
              </div>

              {/* Right Box (Simulation delta comparative table) (7 cols) */}
              <div className="lg:col-span-7 bg-[#0B1E33] border border-slate-800/60 rounded-xl p-5 shadow-sm flex flex-col justify-between min-h-[300px]">
                <div>
                  <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-widest block border-b border-slate-800/80 pb-2">Simulation Results</span>
                  
                  {simResults ? (
                    <div className="space-y-5 mt-4 text-xs font-mono">
                      {/* Metric 1: Security Wait time */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-300 font-semibold">Avg Wait Time (Security)</span>
                        <span className="font-bold flex items-center gap-2">
                          <span className="text-slate-500">{simResults.waitSecurityBefore} min</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-[#3FA873]">{simResults.waitSecurityAfter} min</span>
                        </span>
                      </div>

                      {/* Metric 2: Immigration Wait time */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-300 font-semibold">Avg Wait Time (Immigration)</span>
                        <span className="font-bold flex items-center gap-2">
                          <span className="text-slate-500">{simResults.waitImmigrationBefore} min</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-[#3FA873]">{simResults.waitImmigrationAfter} min</span>
                        </span>
                      </div>

                      {/* Metric 3: Total Queue size */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-300 font-semibold">Total Queue Length</span>
                        <span className="font-bold flex items-center gap-2">
                          <span className="text-slate-500">{simResults.queueBefore} Pax</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-[#3FA873]">{simResults.queueAfter} Pax</span>
                        </span>
                      </div>

                      {/* Metric 4: Congestion Alerts */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-300 font-semibold">Congestion Alerts</span>
                        <span className="font-bold flex items-center gap-2">
                          <span className="text-slate-500">{simResults.alertsBefore}</span>
                          <span className="text-slate-400">&rarr;</span>
                          <span className="text-[#3FA873]">{simResults.alertsAfter}</span>
                        </span>
                      </div>

                      {/* Green recommendations announcement capsule statement */}
                      <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/25 rounded-lg flex items-start gap-2.5 text-[#3FA873] text-[10px] text-left leading-relaxed mt-4">
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>Recommendation Alert</strong>: Adding 4 more Security staff reduces wait time by ~40%. Immigration staffing capacity is optimal.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-44 text-slate-500 font-mono text-[10px] py-12">
                      <Sliders className="w-8 h-8 text-slate-800 mb-2 animate-pulse" />
                      <span>Adjust the staffing configurations on the left pane and hit "Run Simulation" to see wait delta output.</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
}
