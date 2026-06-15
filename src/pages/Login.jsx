import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, ShieldCheck, Car } from 'lucide-react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect back after positive verification check
  const from = location.state?.from?.pathname || '/sessions';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-gray-50/50">
      {/* Left Column: Form Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white shadow-sm border-r border-gray-100">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-2xl shadow-sm shadow-orange-100 mb-4">P</div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">PBMS Gate Console</h2>
            <p className="mt-2 text-sm text-gray-500">Sign in to manage building check-ins & pricing</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Email address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff@pbms.io (or admin@pbms.io)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
                  <Link to="/forgot-password" className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:opacity-50"
            >
              <LogIn className="h-4 w-4" />
              <span>{loading ? 'Verifying credentials...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Quick Mock Accounts Hint */}
          <div className="rounded-lg border border-orange-100 bg-orange-50/50 p-4 mt-6">
            <h4 className="text-xs font-bold text-orange-800 mb-1">Quick Demo Accounts:</h4>
            <ul className="text-[11px] text-orange-700/80 space-y-1">
              <li>• Admin: <code className="font-semibold">admin@pbms.io</code> (full clearance)</li>
              <li>• Manager: <code className="font-semibold">manager@pbms.io</code> (audits & setup)</li>
              <li>• Staff: <code className="font-semibold">staff@pbms.io</code> (check-ins & checkout)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right Column: Graphic Cover (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center p-12 relative overflow-hidden select-none">
        {/* Dynamic Abstract Grid Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100/50 z-0"></div>
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-orange-200/30 blur-3xl"></div>
        
        <div className="z-10 max-w-lg text-center">
          <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-orange-100 flex items-center justify-center mx-auto text-orange-500 mb-6 border border-orange-50/50">
            <Car className="h-8 w-8" />
          </div>
          <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight">Parking Building Operations</h3>
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
            Standardizing facility structural management, zone classifications, dynamic billing calculators, and operational logs within a single unified workspace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
