const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');
const indexPath = path.join(distPath, 'index.html');
const joinPath = path.join(distPath, 'join.html');

if (!fs.existsSync(indexPath)) {
  console.error("index.html not found in dist. Ensure this runs after 'vite build'.");
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Replace OG Title
html = html.replace(
  '<meta property="og:title" content="eversia" />',
  '<meta property="og:title" content="Invito Assemblea d\'Istituto 🎫" />'
);

// Replace OG Description
html = html.replace(
  '<meta property="og:description" content="Piattaforma ufficiale per la gestione delle assemblee d\'Istituto del Liceo Agnesi. Prenotazioni, check-in e agenda in tempo reale." />',
  '<meta property="og:description" content="Sei stato invitato a partecipare all\'Assemblea d\'Istituto. Clicca qui per scegliere le tue attività e creare la tua agenda!" />'
);

// Replace generic page title (optional, but good for some scrapers)
html = html.replace(
  '<title>eversia</title>',
  '<title>Invito Assemblea d\'Istituto</title>'
);

fs.writeFileSync(joinPath, html);
console.log('✅ Generated join.html for SEO/OpenGraph previews!');
