# Dodatok č. 1 k Zmluve o spracúvaní osobných údajov — načítanie označených správ z Gmailu

> **NÁVRH — nie je právne posúdený.** Pred podpisom ho musí prejsť právnik/founder.
> Súvisí s `docs/architecture/inbound-gmail-pull-gdpr.md` (posúdenie, bez skillu `gdpr-advisor`).
> Polia označené ⚠️ DOPLNIŤ vyplní Prevádzkovateľ a Sprostredkovateľ; údaje strán sú v hlavnej zmluve
> (`docs/legal/DPA_Reality_Smolko.md`) a tu sa neopakujú.

Dodatok dopĺňa hlavnú Zmluvu (čl. 2 a Prílohu č. 2). Ostatné ustanovenia Zmluvy sa nemenia.

## 1. Nový účel a operácia

**1.1.** K účelom v čl. 2.1 sa dopĺňa: *prijímanie dopytov záujemcov, ktoré Prevádzkovateľ dostal do svojej
Gmail schránky, do CRM Služby Revolis.AI bez ich preposielania e-mailom.*

**1.2.** K operáciám v čl. 2.6 sa dopĺňa: *čítanie správ opatrených štítkom, ktorý Prevádzkovateľ sám určil
(predvolene „Revolis"), cez rozhranie Gmail API s oprávnením iba na čítanie.*

## 2. Údaje a ich zdroj

**2.1.** Zdrojom je Gmail účet Prevádzkovateľa (⚠️ DOPLNIŤ adresu účtu). Spracúvajú sa **len** správy so štítkom
podľa bodu 1.2: predmet, text správy a z nich identifikačné a kontaktné údaje záujemcu (meno, e-mail, telefón,
preferencie) ako pri doterajšom príjme dopytov.

**2.2.** Sprostredkovateľ **nesťahuje prílohy**, neotvára správy bez štítka a celú schránku nečíta. Telo jednej
správy sa orezáva na 200 000 znakov.

## 3. Pokyn a súhlas

**3.1.** Udelenie prístupu v okne Google je **pokynom Prevádzkovateľa** podľa čl. 28 ods. 3 písm. a) GDPR a
oprávnením na prístup do účtu. Nie je to právny základ pre údaje záujemcov; ten ostáva na strane
Prevádzkovateľa (⚠️ DOPLNIŤ po posúdení: predzmluvné opatrenia čl. 6 ods. 1 písm. b) / oprávnený záujem čl. 6 ods. 1 písm. f)).

**3.2.** Prevádzkovateľ môže pokyn kedykoľvek odvolať: v Google účte (Zabezpečenie → Aplikácie s prístupom)
alebo písomne Sprostredkovateľovi. Sprostredkovateľ po odvolaní do 24 hodín zmaže uložený prístupový token.

## 4. Technické upozornenie, ktoré Prevádzkovateľ berie na vedomie

Google neponúka oprávnenie obmedzené na jeden štítok. Prístup „iba na čítanie" je technicky celoschránkový;
obmedzenie na štítok zabezpečuje aplikácia Sprostredkovateľa (dopyt len s identifikátorom štítka, zahodenie správ
bez štítka, automatizované testy). Sprostredkovateľ sa zaväzuje toto obmedzenie nezrušiť bez písomného dodatku.

## 5. Uchovávanie

**5.1.** Zoznam už spracovaných správ obsahuje iba identifikátor správy a výsledok spracovania (bez obsahu a adries) a
maže sa po 30 dňoch.

**5.2.** Leady vzniknuté zo správ sa uchovávajú podľa hlavnej Zmluvy (čl. 2.3, čl. 9).

**5.3.** Prístupový token je uložený v zabezpečenej konfigurácii prostredia Sprostredkovateľa, nie v zdrojovom
kóde ani v protokoloch (Príloha č. 1, časť C).

## 6. Ďalší sprostredkovatelia

**6.1.** Google (poskytovateľ schránky Prevádzkovateľa) nie je ďalším sprostredkovateľom Sprostredkovateľa; je
poskytovateľom Prevádzkovateľa.

**6.2.** Príloha č. 2 už uvádza „OpenAI (alebo Anthropic)". ⚠️ DOPLNIŤ: spresniť, ktorý z nich skutočne spracúva
text dopytov (AI triáž), a vypísať ho samostatným riadkom — nejasné „alebo" je pri dopytoch s kontaktmi záujemcov slabé.

## 7. Platnosť

Dodatok nadobúda účinnosť podpisom oboch strán. Ukončením hlavnej Zmluvy zaniká.

| | Prevádzkovateľ | Sprostredkovateľ |
|---|---|---|
| Meno | ⚠️ DOPLNIŤ | ⚠️ DOPLNIŤ |
| Dátum | | |
| Podpis | | |
