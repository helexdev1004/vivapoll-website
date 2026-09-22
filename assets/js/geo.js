/* VivaPoll – the countries and regions the product offers.
 *
 * Lifted out of auth.js so the sign-up form and the profile screen offer the same lists.
 * Two copies of this would drift the first time one of them was edited.
 */
window.VP_GEO = {
  // Names are localised at render time with Intl.DisplayNames, so only the codes live here.
  COUNTRIES: ['AR', 'AT', 'AU', 'BE', 'BR', 'CA', 'CH', 'CO', 'DE', 'ES', 'FR', 'GB', 'IE', 'IN', 'IT', 'MX', 'NL', 'PT', 'US'],

  // Regions for the most common countries; the rest get a single "Not applicable" option.
  REGIONS: {
    NL: ['Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg', 'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland', 'Zuid-Holland'],
    BE: ['Brussels', 'Flanders', 'Wallonia'],
    FR: ['Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Bretagne', 'Centre-Val de Loire', 'Corse', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandie', 'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d’Azur'],
    DE: ['Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen', 'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen', 'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen'],
    ES: ['Andalucía', 'Aragón', 'Asturias', 'Baleares', 'Canarias', 'Cantabria', 'Castilla y León', 'Castilla-La Mancha', 'Cataluña', 'Comunidad Valenciana', 'Extremadura', 'Galicia', 'La Rioja', 'Madrid', 'Murcia', 'Navarra', 'País Vasco'],
    IT: ['Abruzzo', 'Basilicata', 'Calabria', 'Campania', 'Emilia-Romagna', 'Friuli-Venezia Giulia', 'Lazio', 'Liguria', 'Lombardia', 'Marche', 'Molise', 'Piemonte', 'Puglia', 'Sardegna', 'Sicilia', 'Toscana', 'Trentino-Alto Adige', 'Umbria', 'Valle d’Aosta', 'Veneto'],
    GB: ['England', 'Northern Ireland', 'Scotland', 'Wales'],
    US: ['Alabama', 'Alaska', 'Arizona', 'California', 'Colorado', 'Florida', 'Georgia', 'Illinois', 'Massachusetts', 'Michigan', 'New Jersey', 'New York', 'North Carolina', 'Ohio', 'Pennsylvania', 'Texas', 'Virginia', 'Washington', 'Other'],
    IN: ['Andhra Pradesh', 'Delhi', 'Gujarat', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'West Bengal', 'Other'],
    BR: ['Bahia', 'Ceará', 'Distrito Federal', 'Minas Gerais', 'Paraná', 'Pernambuco', 'Rio de Janeiro', 'Rio Grande do Sul', 'Santa Catarina', 'São Paulo', 'Other'],
    CO: ['Antioquia', 'Atlántico', 'Bogotá D.C.', 'Bolívar', 'Cundinamarca', 'Santander', 'Valle del Cauca', 'Other']
  }
};
