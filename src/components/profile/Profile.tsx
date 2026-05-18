import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { UserProfile } from '../../types';
import { User, Camera, Mail, Info, ShieldCheck, Save, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (u) {
        fetchProfile(u.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        // Initial profile
        const initial = {
          uid,
          username: auth.currentUser?.displayName || 'Unknown User',
          avatarUrl: auth.currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
          bio: 'Welcome to my CricSim profile!',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        setProfile(initial as UserProfile);
      }
    } catch (error) {
      console.error("Profile fetch failed", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Profile save failed", error);
      alert("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 space-y-4">
      <Loader2 className="w-8 h-8 text-yellow-500 animate-spin" />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Synching Neural ID...</p>
    </div>
  );

  if (!user) return (
    <div className="text-center p-20 bg-[#11151D] rounded-[3rem] border border-slate-800/60 shadow-2xl">
      <ShieldCheck className="w-16 h-16 text-slate-800 mx-auto mb-6" />
      <h3 className="text-xl font-black text-slate-400 uppercase tracking-tight italic">Authorization Required</h3>
      <p className="text-slate-600 text-sm font-medium mt-2">Please sign in to access and manage your profile.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
         <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] overflow-hidden border-4 border-slate-800 shadow-2xl relative">
               <img 
                 src={profile?.avatarUrl} 
                 alt="Avatar" 
                 referrerPolicy="no-referrer"
                 className="w-full h-full object-cover"
               />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="text-white w-8 h-8" />
               </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-500 p-2 rounded-xl border-4 border-[#0B0E14] shadow-lg">
               <ShieldCheck size={16} className="text-black" />
            </div>
         </div>

         <div className="text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-4">
               <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">{profile?.username}</h2>
               <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-widest">Verified Human</span>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] flex items-center justify-center md:justify-start gap-2">
               <Mail size={12} className="text-yellow-500" />
               {user.email}
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-8 bg-[#151921] p-10 rounded-[2.5rem] border border-slate-800/60 shadow-2xl">
           <div className="flex items-center gap-3">
              <User className="text-yellow-500" size={20} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Identity Metadata</h4>
           </div>
           
           <div className="space-y-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Agent Name</label>
                 <input 
                   type="text" 
                   value={profile?.username || ''} 
                   onChange={e => setProfile(prev => prev ? {...prev, username: e.target.value} : null)}
                   className="w-full bg-[#0B0E14] border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-yellow-500/30 transition-all"
                   placeholder="Enter username"
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Avatar Vector URL</label>
                 <input 
                   type="text" 
                   value={profile?.avatarUrl || ''} 
                   onChange={e => setProfile(prev => prev ? {...prev, avatarUrl: e.target.value} : null)}
                   className="w-full bg-[#0B0E14] border border-slate-800 rounded-2xl px-6 py-4 text-white font-bold text-sm focus:outline-none focus:border-yellow-500/30 transition-all font-mono"
                   placeholder="https://..."
                 />
                 <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest ml-1">Use a direct link to an image file (e.g. Dicebear, Imgur)</p>
              </div>
           </div>
        </div>

        <div className="space-y-8 bg-[#151921] p-10 rounded-[2.5rem] border border-slate-800/60 shadow-2xl">
           <div className="flex items-center gap-3">
              <Info className="text-yellow-500" size={20} />
              <h4 className="text-sm font-black text-white uppercase tracking-widest italic">Personal Dossier</h4>
           </div>
           
           <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Biography / Tactics</label>
              <textarea 
                value={profile?.bio || ''} 
                onChange={e => setProfile(prev => prev ? {...prev, bio: e.target.value} : null)}
                className="w-full h-[180px] bg-[#0B0E14] border border-slate-800 rounded-2xl px-6 py-4 text-white font-medium text-sm focus:outline-none focus:border-yellow-500/30 transition-all resize-none shadow-inner leading-relaxed"
                placeholder="Tell us about your management style..."
              />
           </div>
        </div>

        <div className="md:col-span-2">
           <button 
             onClick={handleSave}
             disabled={saving}
             className="w-full py-6 bg-gradient-to-r from-yellow-500 to-orange-600 text-black rounded-3xl font-black text-xs uppercase tracking-[0.4em] transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-2xl shadow-orange-500/20 flex items-center justify-center gap-4 disabled:opacity-50 disabled:grayscale"
           >
             {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
             Commit Profile Changes
           </button>
        </div>
      </div>
    </div>
  );
}
