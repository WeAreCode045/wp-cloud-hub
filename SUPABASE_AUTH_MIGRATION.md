# Supabase Authenticatie Migratie

## ✅ Wat is er veranderd?

De app is nu volledig gemigreerd van Base44 authenticatie naar **Supabase authenticatie**.

### Aangepaste bestanden:

1. **`src/pages/Auth.jsx`** - Nieuwe login/registratie pagina
   - Email/wachtwoord login
   - Registratie met email verificatie
   - Google OAuth integratie
   - Wachtwoord reset functionaliteit
   - Mooie UI met tabs en animaties

2. **`src/lib/AuthContext.jsx`** - Nieuwe auth context provider
   - Gebruik van Supabase `auth.getSession()` en `onAuthStateChange()`
   - Backward compatible met oude API (user, isAuthenticated, logout, etc.)
   - Session management

3. **`src/App.jsx`** - Route bescherming
   - Auth route (`/Auth`) is nu openbaar
   - Alle andere routes zijn beschermd
   - Automatische redirect naar `/Auth` als niet ingelogd

4. **`src/Layout.jsx`** - Logout functionaliteit
   - Gebruikt nu `authLogout()` van Supabase
   - Navigeert naar `/Auth` na uitloggen

5. **`src/pages/Info.jsx`** - Login redirect
6. **`src/pages/TwoFactorAuth.jsx`** - Login redirect
7. **`src/pages.config.js`** - Auth pagina toegevoegd

## 🚀 Wat moet je doen?

### 1. Environment variabelen instellen

Zorg ervoor dat je de juiste Supabase credentials hebt in je `.env` bestand:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Supabase Email Templates configureren (optioneel)

In je Supabase dashboard > Authentication > Email Templates kun je de emails aanpassen voor:
- Account verificatie
- Wachtwoord reset
- Magic link login

### 3. Google OAuth instellen (optioneel)

Als je Google login wilt gebruiken:

1. Ga naar Supabase dashboard > Authentication > Providers
2. Enable Google provider
3. Voeg je OAuth credentials toe van Google Cloud Console
4. Voeg redirect URLs toe:
   - `https://your-project.supabase.co/auth/v1/callback`
   - `http://localhost:5173` (voor development)

### 4. App testen

```bash
npm run dev
```

**Test scenario's:**
- ✅ Bezoek de app - je wordt naar `/Auth` gestuurd
- ✅ Registreer een nieuw account
- ✅ Check je email voor verificatie link
- ✅ Log in met email/wachtwoord
- ✅ Test de "Wachtwoord vergeten" functionaliteit
- ✅ Test Google login (als geconfigureerd)
- ✅ Test de logout functionaliteit
- ✅ Probeer een beschermde route te bezoeken zonder login

## 📋 Belangrijke opmerkingen

### User Data

De `user` object van Supabase heeft een andere structuur dan Base44:

**Base44:**
```javascript
{
  id: "123",
  email: "user@example.com",
  name: "John Doe",
  role: "admin",
  // etc.
}
```

**Supabase:**
```javascript
{
  id: "uuid",
  email: "user@example.com",
  user_metadata: {
    // custom data hier
  },
  app_metadata: {
    // admin data hier
  },
  // etc.
}
```

Als je app specifieke user fields nodig heeft (zoals `name`, `role`, `avatar_url`), moet je deze:
1. Opslaan in `user_metadata` bij signup
2. Of een aparte `profiles` tabel maken in Supabase

### Base44 Dependencies

De volgende functies gebruiken nog steeds Base44:
- `base44.entities.*` - Database queries
- `base44.functions.invoke()` - Cloud functions
- Notificaties, berichten, teams, etc.

Deze blijven werken omdat alleen de **authenticatie** is vervangen.

### Protected Routes

Alle routes behalve `/Auth` zijn nu automatisch beschermd. Als een gebruiker probeert een beschermde route te bezoeken zonder ingelogd te zijn, worden ze naar `/Auth` gestuurd.

## 🔄 Migratie van bestaande users

Als je al users hebt in Base44, moet je ze migreren naar Supabase:

1. Export users uit Base44
2. Importeer ze in Supabase via de dashboard of API
3. Stuur ze een wachtwoord reset email

Of gebruik beide systemen tijdelijk parallel met een custom login flow.

## 🐛 Troubleshooting

### "Invalid login credentials"
- Check of de email geverifieerd is in Supabase dashboard
- Controleer of email confirmatie is uitgeschakeld (voor testing)

### Redirect loop na login
- Check of de `/Auth` route correct is geconfigureerd
- Kijk in browser console voor errors

### Google login werkt niet
- Controleer OAuth credentials in Supabase dashboard
- Check redirect URLs
- Kijk of Google OAuth is enabled

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase React Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)
- [Supabase Auth UI](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui)
