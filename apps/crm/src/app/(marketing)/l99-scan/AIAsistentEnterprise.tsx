"use client";

import React, { useState } from 'react';
import {
  Lock, Mail, Bell, Mic2, Map, ListChecks, PhoneCall,
  AlertTriangle, Hammer, Globe, HeartPulse, Users
} from 'lucide-react';

const L99ScanDashboardFinalV5 = () => {
  const [activeTab, setActiveTab] = useState('enterprise');

  const handleLockedClick = (tier: string) => {
    alert(`Tento modul je dostupný v programe ${tier.toUpperCase()}. Ak ho chcete aktivovať, prepnite balík v hornom menu.`);
  };

  return (
    <div className="min-h-screen bg-[#020205] text-slate-200 font-sans p-4 md:p-12 selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto">

        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 text-blue-400 font-bold italic text-[10px] uppercase tracking-widest">
            Revolis L99 Radar príležitostí aktívny
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight uppercase italic">
            REVOLIS <span className="text-blue-500">EKOSYSTÉM</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl">
            Od bežnej práce po prediktívnu inteligenciu. Najsilnejšie dáta na slovenskom trhu.
          </p>
        </header>

        {/* PREPÍNAČ PROGRAMOV */}
        <div className="flex flex-wrap gap-4 mb-12 border-b border-white/5 pb-8">
          {['starter', 'pro', 'enterprise'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                activeTab === tab
                ? 'bg-blue-600 text-white shadow-[0_0_20px_-5px_rgba(37,99,235,0.6)] scale-105'
                : 'bg-white/5 text-slate-500 hover:bg-white/10'
              }`}
            >
              {tab === 'enterprise' ? 'Enterprise (L99)' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

          {/* --- STARTER (Vždy aktívne) --- */}
          <div className="p-8 rounded-[2rem] border bg-[#0A0A12] border-white/10 transition-all hover:border-blue-500/30">
            <div className="flex justify-between mb-8 text-blue-400"><ListChecks size={32} /></div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">AI Plán práce</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              <strong>Jednoducho:</strong> AI ti ráno povie, komu máš zavolať ako prvému, aby si dnes čo najrýchlejšie zarobil.
            </p>
            <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
               Zobraziť môj plán na dnes
            </button>
          </div>

          <div className="p-8 rounded-[2rem] border bg-[#0A0A12] border-white/10 transition-all hover:border-blue-500/30">
            <div className="flex justify-between mb-8 text-blue-400"><PhoneCall size={32} /></div>
            <h3 className="text-xl font-bold text-white mb-3 uppercase italic">AI Call Analyzer</h3>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              <strong>Jednoducho:</strong> Robot si vypočuje tvoj hovor a napíše ti tipy, ako nabudúce v klientovi <strong>vyvolať záujem cez telefón</strong>.
            </p>
            <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
               Zistiť, ako vyvolať záujem cez telefón
            </button>
          </div>

          {/* --- PRO (Stredný balík) --- */}
          {[
            { id: 'ghost', title: 'AI Ghostwriter', icon: <Mail size={32}/>, color: 'indigo', text: 'AI napíše majiteľovi list, ktorý ho tak zaujme, že ti sám zavolá kvôli predaju.', btn: 'Vyvolať neodolateľný záujem o predaj', tier: 'pro' },
            { id: 'radar', title: 'Katastrálny Radar', icon: <Bell size={32}/>, color: 'red', text: 'Radar, ktorý ti pípne vždy, keď niekto získa byt, aby si mu mohol hneď ponúknuť pomoc.', btn: 'Vyvolať záujem čerstvých dedičov', tier: 'pro' },
            { id: 'dead', title: 'Úmrtia a dedičstvo', icon: <HeartPulse size={32}/>, color: 'pink', text: 'Sleduje notárske zápisnice. Vieš o voľnom byte skôr, než sa rodina stihne dohodnúť na cene.', btn: 'Vyvolať záujem u dedičov', tier: 'pro' }
          ].map((item) => {
            const isLocked = activeTab === 'starter';
            return (
              <div key={item.id} className={`group relative p-8 rounded-[2rem] border transition-all duration-500 ${!isLocked ? 'bg-[#0A0A12] border-indigo-500/30' : 'bg-[#050508] border-white/5 opacity-30 cursor-not-allowed'}`}>
                {isLocked && <div className="absolute top-4 right-4 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse z-10">V cene od programu Pro</div>}
                <div className={`flex justify-between mb-8 text-${item.color}-400`}>{item.icon} {isLocked && <Lock size={16}/>}</div>
                <h3 className="text-xl font-bold text-white mb-3 uppercase italic">{item.title}</h3>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed"><strong>Jednoducho:</strong> {item.text}</p>
                <button onClick={() => isLocked && handleLockedClick('Pro')} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLocked ? 'bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600 text-white' : 'bg-white/5 text-slate-600'}`}> {item.btn} </button>
              </div>
            );
          })}

          {/* --- ENTERPRISE (L99) --- */}
          {[
            { id: 'skener', title: 'Emocionálny skener', icon: <Mic2 size={32}/>, text: 'AI spozná, čo sa klientovi na byte fakt páči a povie ti, na čo máš zatlačiť, aby si u neho vyvolal záujem.', btn: 'Vyvolať okamžitý záujem kupujúceho' },
            { id: 'bod', title: 'Bod Zlomu', icon: <Map size={32}/>, text: 'Mapa, ktorá ti ukáže, na ktorej ulici sa o chvíľu začne sťahovať veľa ľudí. Budeš tam prvý.', btn: 'Vyvolať záujem celého susedstva' },
            { id: 'finance', title: 'Finančné problémy', icon: <AlertTriangle size={32}/>, text: 'AI sleduje exekúcie a dlhy majiteľov. Vieš, kto potrebuje súrne peniaze a rýchly predaj bytu.', btn: 'Vyvolať záujem o rýchly odkup' },
            { id: 'build', title: 'Plánovaná stavba', icon: <Hammer size={32}/>, text: 'Sleduje úrady. Ak niekto dostal povolenie na stavbu domu, čoskoro bude predávať svoj byt.', btn: 'Vyvolať záujem o financovanie stavby' },
            { id: 'change', title: 'Zmena v okolí', icon: <Globe size={32}/>, text: 'Sleduje satelity a územné plány. Vieš, kde postavia novú školu alebo park, čo zvýši cenu bytov.', btn: 'Vyvolať záujem o investíciu' },
            { id: 'mood', title: 'Nálada v komunite', icon: <Users size={32}/>, text: 'Sleduje tajné diskusie a Facebook skupiny. Vieš, o čom ľudia v meste snívajú a čo sa chystajú predať.', btn: 'Vyvolať záujem v komunitách' }
          ].map((item) => {
            const isLocked = activeTab !== 'enterprise';
            return (
              <div key={item.id} className={`group relative p-8 rounded-[2rem] border transition-all duration-500 ${!isLocked ? 'bg-[#0A0A12] border-blue-500/30 shadow-[0_0_30px_-10px_rgba(37,99,235,0.2)]' : 'bg-[#050508] border-white/5 opacity-30 cursor-not-allowed'}`}>
                {isLocked && <div className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse z-10">V cene od programu Enterprise</div>}
                <div className="flex justify-between mb-8 text-blue-400">{item.icon} {isLocked && <Lock size={16}/>}</div>
                <h3 className="text-xl font-bold text-white mb-3 uppercase italic">{item.title}</h3>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed"><strong>Jednoducho:</strong> {item.text}</p>
                <button onClick={() => isLocked && handleLockedClick('Enterprise')} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${!isLocked ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 hover:scale-105' : 'bg-white/5 text-slate-600'}`}> {item.btn} </button>
              </div>
            );
          })}

        </div>

        <footer className="mt-20 p-12 bg-blue-600/10 border border-blue-500/20 rounded-[3rem] text-center">
          <h3 className="text-2xl font-black text-white mb-4 uppercase italic">Vlastni dáta, ktoré konkurencia ani netuší, že existujú.</h3>
          <button className="px-10 py-5 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-blue-600/20">
             Odomknúť Enterprise Inteligenciu
          </button>
        </footer>

      </div>
    </div>
  );
};

export default L99ScanDashboardFinalV5;
