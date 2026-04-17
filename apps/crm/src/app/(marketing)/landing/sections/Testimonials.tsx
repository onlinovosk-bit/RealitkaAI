"use client";
import { motion } from 'framer-motion';
import { LANDING_AI_ASSISTANT_NAME } from '@/app/(marketing)/landing/landing-ai-label';

const TESTIMONIALS = [
  {
    stars: 5,
    quote: `${LANDING_AI_ASSISTANT_NAME} zachránil môj biznis. Odpovedá kým spím a ráno mám naplánované obhliadky.`,
    name: 'Tomáš Novák',
    company: 'Reality Novák, Bratislava',
    metric: '+41% konverzia',
    metricColor: '#22D3EE',
  },
  {
    stars: 5,
    quote: 'Prvý mesiac som uzatvoril 3 obchody navyše. AI skórovanie mi ušetrí hodiny denne.',
    name: 'Marta Kováčová',
    company: 'MK Reality, Košice',
    metric: '+3 obchody/mes.',
    metricColor: '#34D399',
  },
  {
    stars: 5,
    quote: 'Myslel som, že AI v realitách je prázdne módne slovo. Mýlil som sa. Revolis je úplne inde.',
    name: 'Peter Horváth',
    company: 'Horváth & Partner, Nitra',
    metric: '2x rýchlejší',
    metricColor: '#818CF8',
  },
  {
    stars: 5,
    quote: 'Za prvé 2 týždne sme skrátili čas odpovede na dopyt z hodín na minúty. Makléri už nefungujú naslepo.',
    name: 'Lucia Šimková',
    company: 'L&S Reality, Trnava',
    metric: '−68 % čas do odpovede',
    metricColor: '#22D3EE',
  },
  {
    stars: 5,
    quote: 'Denný plán úloh nám dáva jasné priority. Tím vie ráno presne, komu volať ako prvému.',
    name: 'Ivan Mikula',
    company: 'Mikula Reality, Žilina',
    metric: '+29 % následných kontaktov',
    metricColor: '#34D399',
  },
  {
    stars: 5,
    quote: 'Predtým sme strácali záujemcov medzi portálmi. Teraz je všetko na jednom mieste a pod kontrolou.',
    name: 'Simona Križanová',
    company: 'SK Home, Banská Bystrica',
    metric: '+37 % obnovených kontaktov',
    metricColor: '#818CF8',
  },
  {
    stars: 5,
    quote: 'Najviac oceňujem, že AI navrhuje konkrétnu správu. Maklér len upraví detaily a odosiela.',
    name: 'Róbert Duda',
    company: 'RD Reality, Poprad',
    metric: '2.3x viac odpovedí',
    metricColor: '#F59E0B',
  },
  {
    stars: 5,
    quote: 'Úvodné nastavenie bolo jednoduché. Do jedného dňa sme mali bežiaci systém a prvé merateľné výsledky.',
    name: 'Barbora Cibulová',
    company: 'CIB Estates, Nitra',
    metric: 'Nasadenie do 24 h',
    metricColor: '#22D3EE',
  },
  {
    stars: 5,
    quote: 'Pre vedúceho kancelárie je to zásadná zmena. Vidím, kto rieši čo a kde sa zasekáva predajný proces.',
    name: 'Milan Jurík',
    company: 'Jurík Partners, Trenčín',
    metric: '+31 % prehľadu v procese',
    metricColor: '#34D399',
  },
  {
    stars: 5,
    quote: 'Následné kontakty boli náš najväčší problém. Po zavedení Revolis sa prestali strácať horúce príležitosti.',
    name: 'Katarína Bartošová',
    company: 'KB Reality Group, Prešov',
    metric: '+33 % opätovného oslovenia',
    metricColor: '#818CF8',
  },
  {
    stars: 5,
    quote: 'Pri rovnakom počte ľudí robíme viac uzavretých obchodov. Konečne vieme, čo má najvyšší dopad.',
    name: 'Ondrej Varga',
    company: 'Varga Reality, Bratislava',
    metric: '+26 % úspešnosti obchodov',
    metricColor: '#F59E0B',
  },
  {
    stars: 5,
    quote: 'Na rozhovoroch s klientmi už nepredávame „softvér“, ale výsledky. Prehľad v aplikácii hovorí jasnou rečou.',
    name: 'Veronika Hudecová',
    company: 'VH Homes, Košice',
    metric: '+34 % konverzie',
    metricColor: '#22D3EE',
  },
];

export default function Testimonials() {
  return (
    <section className="py-28" style={{ background: '#050914' }}>
      <div className="mx-auto max-w-5xl px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true, margin: '-80px' }}
          className="text-center mb-14"
        >
          <p className="text-sm uppercase tracking-[0.3em] mb-4"
             style={{ color: '#22D3EE' }}>
            Reálne výsledky
          </p>
          <h2
            className="text-4xl sm:text-5xl font-extrabold"
            style={{ fontFamily: 'var(--font-syne)', color: '#F0F9FF' }}
          >
            Čo hovoria naši makléri
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Overené skúsenosti z kancelárií naprieč Slovenskom.
          </p>
        </motion.div>
        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, margin: '-40px' }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="flex flex-col rounded-2xl p-6"
              style={{
                background: '#0A1628',
                border: '1px solid #112240',
              }}
            >
              <div className="text-xs mb-4 font-semibold" style={{ color: '#FBBF24' }}>
                Hodnotenie {t.stars}/5
              </div>
              {/* Quote */}
              <p
                className="text-sm leading-relaxed flex-1 mb-6 italic"
                style={{ color: '#94A3B8' }}
              >
                „{t.quote}"
              </p>
              {/* Author + metric */}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm font-bold" style={{ color: '#F0F9FF' }}>
                    {t.name}
                  </p>
                  <p className="text-xs" style={{ color: '#475569' }}>
                    {t.company}
                  </p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap"
                  style={{
                    color: t.metricColor,
                    background: `${t.metricColor}18`,
                    border: `1px solid ${t.metricColor}35`,
                  }}
                >
                  {t.metric}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
