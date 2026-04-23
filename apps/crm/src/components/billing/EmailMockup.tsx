export function EmailMockup() {
  return (
    <div className="w-full">
      {/* Nadpis */}
      <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-4 text-center">
        Pán Smolko, takto budú vyzerať automatické reporty
        pre Vašich klientov už o 15 minút.
      </p>

      {/* Mockup e-mailu */}
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 font-sans text-slate-800">

        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200">
          <div className="text-[9px] text-slate-400 uppercase tracking-widest mb-1.5 font-bold">Odosielateľ:</div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-[10px] text-white font-black flex-shrink-0">
              RS
            </div>
            <span className="text-xs font-bold text-slate-700 italic">
              Reality Smolko – Osobný sprievodca
            </span>
          </div>
          <div className="mt-2 text-[9px] text-slate-400">
            <span className="font-bold text-slate-500">Predmet:</span>{" "}
            Za koľko predal sused? Váš mesačný report je tu.
          </div>
        </div>

        {/* Telo */}
        <div className="p-6">
          <div className="text-center mb-5">
            <h2 className="text-base font-black text-slate-900 uppercase italic tracking-tight">
              Za koľko predal sused?
            </h2>
            <p className="text-[10px] text-blue-600 font-bold tracking-wider italic mt-0.5">
              REPORT: Prešov – Sídlisko III
            </p>
          </div>

          <div className="space-y-3">
            {/* Predaj */}
            <div className="p-3 bg-blue-50 rounded-xl border-l-4 border-blue-500">
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                Ulica v susedstve
              </p>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">3-izbový byt (68 m²)</span>
                <span className="text-xs font-black text-blue-700">PREDANÉ: 158 500 €</span>
              </div>
            </div>

            {/* Trhový trend */}
            <div className="p-5 bg-slate-900 rounded-2xl text-center text-white relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-[9px] uppercase tracking-[0.25em] opacity-50 mb-1">
                  Odhadovaná hodnota Vášho majetku
                </p>
                <p className="text-3xl font-black italic my-2 text-green-400">+1.2 %</p>
                <div className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-[9px] font-bold rounded-full uppercase tracking-widest">
                  Aktuálny trhový trend
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-500/10 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-[9px] text-slate-400 leading-relaxed italic">
            Tento report Vám prináša{" "}
            <span className="font-bold text-slate-600">Reality Smolko</span>{" "}
            v spolupráci s L99 Engine.
            Pán Smolko, Váš maklér, je pripravený na konzultáciu.
          </div>
        </div>
      </div>
    </div>
  );
}
