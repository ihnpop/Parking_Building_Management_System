import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulate API call for password reset link dispatch
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSubmitted(true);
    } catch (err) {
      setError('Failed to process request. Please contact your system administrator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex bg-gray-50/50">
      {/* Left Column: Reset Password Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white shadow-sm border-r border-gray-100">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <Link to="/login" className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-orange-600 transition-colors mb-6 group">
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Sign In</span>
            </Link>
            
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-2xl shadow-sm shadow-orange-100 mb-4">P</div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Reset Password</h2>
            <p className="mt-2 text-sm text-gray-500">Provide your registered email to request a reset link</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-4 text-xs font-semibold text-red-600 border border-red-100">
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Email address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="e.g. operator@pbms.io"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-orange-100 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                <span>{loading ? 'Sending Request...' : 'Send Reset Link'}</span>
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-xl border border-green-100 bg-green-50/50 p-6 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-green-800">Check Your Inbox</h3>
                <p className="text-xs text-green-700/80 mt-1 leading-relaxed">
                  We have sent password recovery instructions to <strong className="font-semibold text-green-950">{email}</strong>.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Graphic Cover (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center p-12 relative overflow-hidden select-none">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-orange-100/50 z-0"></div>
        <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-orange-200/30 blur-3xl"></div>
        
        <div className="z-10 max-w-lg text-center">
          <div className="h-16 w-16 rounded-2xl bg-white shadow-xl shadow-orange-100 flex items-center justify-center mx-auto text-orange-500 mb-6 border border-orange-50/50">
            <KeyRound className="h-8 w-8" />
          </div>
          <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight">Access Recovery</h3>
          <p className="mt-4 text-sm text-gray-500 leading-relaxed">
            Locked out of the system? Enter your corporate email address to automatically receive credential reset parameters. For further support, contact the building administrator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
