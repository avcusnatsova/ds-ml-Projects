import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../context/AuthContext';
import { Card } from '../components/ui';
import { ShieldCheck, Lock, Mail, ChevronDown } from 'lucide-react';
import ColorBends from '../components/ui/ColorBends';
import SpotlightCard from '../components/ui/SpotlightCard';
import DecryptedText from '../components/ui/DecryptedText';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('Supplier');
  const [isLoading, setIsLoading] = useState(false);

  const roles: Role[] = [
    'Supplier',
    'Driver',
    'Warehouse Manager',
    'Customs Officer',
    'Delivery Partner',
    'Customer'
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate secure login delay
    setTimeout(() => {
      login(role);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 md:p-12 relative overflow-hidden bg-slate-900 font-sans">
      <div className="absolute inset-0 z-0">
        <ColorBends
          colors={["#ab2b89", "#ff5c7a", "#8a5cff", "#00ffd1", "#480b2d"]}
          rotation={45}
          speed={0.95}
          scale={1.0}
          frequency={1.0}
          warpStrength={1.2}
          mouseInfluence={0.5}
          noise={0.1}
          iterations={2}
          intensity={1.8}
          bandWidth={5}
          transparent={false}
        />
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"></div>
      </div>

      <div className="max-w-5xl w-full flex flex-col md:flex-row items-center justify-between gap-12 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

        {/* Left Side: Branding */}
        <div className="md:w-1/2 flex justify-center md:justify-start">
          <SpotlightCard className="text-center md:text-left space-y-6 !bg-black/30 backdrop-blur-md border-white/10" spotlightColor="rgba(0, 229, 255, 0.15)">
            <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-2xl">
              <DecryptedText 
                text="Trustistics"
                animateOn="view"
                speed={40}
                maxIterations={15}
                sequential={true}
              />
            </h2>
            <div className="space-y-4">
              <p className="text-xl md:text-2xl font-bold drop-shadow-sm" style={{ color: '#ab2b89' }}>
                <DecryptedText 
                  text="Cold-Chain Logistics Platform"
                  animateOn="view"
                  speed={30}
                  maxIterations={10}
                />
              </p>
              <div className="h-px w-24 bg-gradient-to-r from-brand-400 to-transparent mx-auto md:mx-0"></div>
              <p className="text-base text-neutral-300 max-w-md leading-relaxed drop-shadow">
                <DecryptedText 
                  text="End-to-end provenance and tampering verification for high-value temperature-sensitive shipments."
                  animateOn="view"
                  speed={20}
                  maxIterations={8}
                />
              </p>
            </div>
          </SpotlightCard>
        </div>

        {/* Right Side: Secure Login Form */}
        <div className="md:w-auto w-full max-w-md flex-shrink-0">
          <Card className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] rounded-2xl relative overflow-hidden">
            {/* Ambient inner glow */}
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"></div>

            <div className="mb-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-2">Access Portal</h3>
              <p className="text-sm text-neutral-400 flex items-center justify-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Secure access to Trustistics network
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-neutral-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-lg leading-5 bg-black/20 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all sm:text-sm"
                    placeholder="name@enterprise.com"
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-neutral-500" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-lg leading-5 bg-black/20 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>

                <div className="relative">
                  <select
                    value={role || ''}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="block w-full pl-3 pr-10 py-3 border border-white/10 rounded-lg leading-5 bg-black/20 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all sm:text-sm appearance-none cursor-pointer"
                  >
                    {roles.map(r => (
                      <option key={r} value={r} className="bg-slate-800 text-white">{r}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-neutral-400" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-600 bg-black/20 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-gray-900"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-xs text-neutral-400">
                    Remember me
                  </label>
                </div>

                <div className="text-xs">
                  <a href="#" className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-black bg-cyan-400 hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {isLoading ? 'Authenticating...' : 'Sign In'}
                </button>
              </div>
            </form>

            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <p className="text-[10px] text-neutral-500 uppercase tracking-widest flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3 h-3 text-brand-500" /> End-to-End Encrypted
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
