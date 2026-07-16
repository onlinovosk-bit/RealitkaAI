# Implementačný plán — samoobslužný reset hesla

1. Oddeliť autentifikáciu od oprávnenia spravovať cudzie účty.
2. Povoliť recovery a recovery-link pre e-mail aktuálneho používateľa.
3. Zachovať owner/founder kontrolu pre cudzie účty a pozvánky.
4. Pridať regresné unit testy pre 401, vlastný reset, zakázaný cudzí reset a owner reset.
5. Spustiť cielené testy, TypeScript kontrolu a produkčný build; následne nasadiť opravu.
