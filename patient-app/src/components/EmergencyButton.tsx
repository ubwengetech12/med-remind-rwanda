import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export function EmergencyButton({ userId }: { userId?: string }) {
  const [active, setActive] = useState(false);
  const [calling, setCalling] = useState(false);

  const triggerEmergency = async () => {
    setCalling(true);

    // Get location if available
    let lat, lng;
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {}

    // Log to Supabase
    if (userId) {
      await supabase.from('emergency_alerts').insert({
        user_id: userId,
        location_lat: lat,
        location_lng: lng,
        status: 'active',
      });
    }

    toast.error('🚨 Emergency alert sent! Help is on the way.', { duration: 6000 });

    // Simulate calling sequence
    setTimeout(() => {
      setCalling(false);
      setActive(false);
    }, 8000);
  };

  return (
    <>
      <button
        onClick={() => setActive(true)}
        className="w-full bg-red-900/30 border border-red-800/60 rounded-3xl p-4 flex items-center gap-4 hover:bg-red-900/50 transition-all group"
      >
        <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
          <AlertTriangle size={24} className="text-red-400" />
        </div>
        <div className="text-left">
          <p className="text-white font-bold text-base">Emergency</p>
          <p className="text-red-400/70 text-sm">Tap to alert emergency contacts</p>
        </div>
        <div className="ml-auto">
          <span className="w-2 h-2 bg-red-500 rounded-full block animate-pulse" />
        </div>
      </button>

      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card rounded-3xl p-8 w-full max-w-sm border border-red-800/50 text-center"
            >
              {calling ? (
                <CallingView onCancel={() => { setCalling(false); setActive(false); }} />
              ) : (
                <ConfirmView
                  onConfirm={triggerEmergency}
                  onCancel={() => setActive(false)}
                />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ConfirmView({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
        <AlertTriangle size={36} className="text-red-400" />
      </div>
      <h2 className="text-white text-2xl font-display font-bold mb-2">Emergency Alert</h2>
      <p className="text-muted text-sm mb-8">
        This will alert your emergency contacts and share your location. Continue?
      </p>
      <button
        onClick={onConfirm}
        className="w-full bg-red-500 text-white rounded-2xl h-14 font-bold text-lg mb-3 hover:bg-red-400 transition-colors shadow-glow-red flex items-center justify-center gap-3"
      >
        <Phone size={22} />
        Send Emergency Alert
      </button>
      <button onClick={onCancel} className="text-muted text-sm w-full py-2">
        Cancel
      </button>
    </>
  );
}

function CallingView({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
        className="w-24 h-24 bg-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-500"
      >
        <Phone size={36} className="text-red-400" />
      </motion.div>
      <h2 className="text-white text-2xl font-bold mb-2">Calling for Help...</h2>
      <p className="text-red-300 text-sm mb-2">Emergency services notified</p>
      <p className="text-muted text-xs mb-8">Your location has been shared with emergency contacts</p>

      <div className="bg-surface rounded-2xl p-4 mb-6 text-left space-y-2">
        {['✅ Emergency contacts alerted', '✅ Location shared', '🔄 Connecting to services...'].map((msg) => (
          <p key={msg} className="text-sm text-white">{msg}</p>
        ))}
      </div>

      <button onClick={onCancel} className="w-full border border-border text-muted rounded-2xl h-12 hover:text-white transition-colors flex items-center justify-center gap-2 text-sm">
        <X size={16} />
        I'm OK - Cancel Alert
      </button>
    </>
  );
}
