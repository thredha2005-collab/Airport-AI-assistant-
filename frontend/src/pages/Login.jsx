import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ShieldAlert, LogIn, MessageSquare } from 'lucide-react';

export default function Login({ setAuth }) {
  const [isStaff, setIsStaff] = useState(false);
  const [pnr, setPnr] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const loginUser = isStaff ? username : pnr;
    const loginPass = isStaff ? password : lastName;

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

      if (data.role === 'passenger') {
        navigate('/passenger-portal');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      if (isStaff) {
        setError("Invalid staff credentials. Please check your username and password.");
      } else {
        // Section 7 required error message
        setError("We couldn't find that booking — check the PNR and last name and try again");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-[#0B3D66]">
      <div className="max-w-md w-full card p-8 bg-white" style={{ borderRadius: '12px', border: '1px solid rgba(11,61,102,0.08)' }}>
        
        {/* Sign In Header */}
        <div className="text-center pb-6 border-b border-slate-100">
          <h2 className="text-2xl font-extrabold tracking-tight text-[#0B3D66]">
            {isStaff ? "Staff Portal Sign In" : "Sign In to Transit"}
          </h2>
          <p className="text-xs text-[#5A6B7B] mt-1.5 leading-relaxed">
            {isStaff ? "Enter your admin credentials below." : "Retrieve your flight details, wait times, and boarding pass."}
          </p>
        </div>

        {/* Error Alert Box (Section 7) */}
        {error && (
          <div className="mt-5 p-4 rounded-xl flex items-start gap-3 bg-[#D14B3D]/10 border border-[#D14B3D]/20 text-[#D14B3D]">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-xs font-bold leading-normal">{error}</p>
          </div>
        )}

        {/* Form - Vertically Stacked Form (Section 7) */}
        <form onSubmit={handleLogin} className="mt-6 space-y-5">
          {!isStaff ? (
            <>
              {/* PNR Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0B3D66] uppercase tracking-wider">
                  Booking Reference (PNR)
                </label>
                <input 
                  type="text" 
                  value={pnr} 
                  onChange={e => setPnr(e.target.value)} 
                  placeholder="e.g. 9GACQD"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-[#0B3D66] font-bold text-base focus:border-[#3FA9F5] placeholder-slate-300"
                  style={{ minHeight: '48px', fontFamily: "'JetBrains Mono', monospace" }}
                />
                <span className="text-[10px] text-[#5A6B7B] font-semibold">Format: 6 alphanumeric characters (e.g. 9GACQD)</span>
              </div>

              {/* Last Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0B3D66] uppercase tracking-wider">
                  Passenger Last Name
                </label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={e => setLastName(e.target.value)} 
                  placeholder="e.g. Doe"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-[#0B3D66] font-bold text-base focus:border-[#3FA9F5] placeholder-slate-300"
                  style={{ minHeight: '48px' }}
                />
              </div>
            </>
          ) : (
            <>
              {/* Staff Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0B3D66] uppercase tracking-wider">
                  Username
                </label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Enter staff username"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-[#0B3D66] font-bold text-base focus:border-[#3FA9F5]"
                  style={{ minHeight: '48px' }}
                />
              </div>

              {/* Staff Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0B3D66] uppercase tracking-wider">
                  Password
                </label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Enter password"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl outline-none text-[#0B3D66] font-bold text-base focus:border-[#3FA9F5]"
                  style={{ minHeight: '48px' }}
                />
              </div>
            </>
          )}

          {/* Submit Button (Section 0 - Light Blue) */}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-[#3FA9F5] hover:bg-[#3FA9F5]/90 text-white border-none rounded-xl text-base font-extrabold cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
            style={{ minHeight: '48px' }}
          >
            <LogIn className="w-5 h-5" />
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        {/* Chatbot Help Note (Section 7) */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-[#5A6B7B] font-semibold flex items-center justify-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#3FA9F5]" />
            Need help signing in? 
            <Link to="/chatbot" className="text-[#3FA9F5] font-bold hover:underline">
              Ask SkyGuide Chatbot
            </Link>
          </p>
        </div>

        {/* Subtle Toggle for Staff Login */}
        <div className="mt-4 text-center">
          <button 
            onClick={() => {
              setIsStaff(!isStaff);
              setError('');
            }}
            className="text-[10px] text-[#8B95AB] font-bold bg-transparent border-none cursor-pointer hover:text-[#0B3D66]"
          >
            {isStaff ? "Passenger Access" : "Staff Access"}
          </button>
        </div>

      </div>
    </div>
  );
}
