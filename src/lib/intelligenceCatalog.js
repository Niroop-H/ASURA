/**
 * Coverage contract for ASURA Defense Intelligence System™ — Developed by MAH Quantum.
 * A named provider is not a connected provider. "direct" means an implemented
 * read-only adapter; "research" means official public websites via browser-search,
 * not a continuously ingested feed. Do not advertise licensing or global reach.
 */
export const INTELLIGENCE_SECTORS=[
 {id:'defence',label:'Defence & public security',direct:['World Bank military expenditure','DVIDS public media (requires API key and terms review)'],research:['SIPRI','NATO','UNODA','DoD public reports','GAO','UN Register of Conventional Arms'],limitations:'Annual or published reports. No military targeting, non-public sensor feeds, classified records or platform vulnerabilities.'},
 {id:'aviation',label:'Aviation & airspace',direct:['adsb.lol regional ADS-B','OurAirports directory','FAA published NAS airport status','FAA TFR aggregate categories'],research:['FAA','NTSB','EUROCONTROL','AviationWeather'],limitations:'Receiver coverage is incomplete; no verified global arrivals or flight-status board without licensed access.'},
 {id:'maritime',label:'Maritime & trade',direct:['IMF PortWatch dataset index (metadata only; not trade readings)','USCG local notices (single-district public RSS)','IMF PortWatch daily sample (written permission required)'],research:['NOAA MarineCadastre','GEBCO','IMO','UN Comtrade','OpenSeaMap'],limitations:'Live AIS needs an authorized provider and may be delayed, spoofed or absent.'},
 {id:'space',label:'Space & orbits',direct:['CelesTrak station GP elements','NOAA SWPC published planetary Kp observations','NASA DONKI storm event notices (DEMO_KEY limited)'],research:['UNOOSA','NASA DONKI','NOAA SWPC','SatNOGS','ESA'],limitations:'Orbital elements are epochs, not live imagery or verified object intent.'},
 {id:'transport',label:'Land & infrastructure',direct:[],research:['OpenStreetMap','GTFS publishers','Global Energy Monitor','EIA','UN/LOCODE'],limitations:'Published reference information only; no sensitive critical-infrastructure attack mapping.'},
 {id:'weather',label:'Weather, climate & hazards',direct:['OpenWeather current/forecast','USGS earthquake observations','NASA EONET events','NOAA/NWS US-state active alerts'],research:['NOAA','Open-Meteo','Copernicus CDS','NASA FIRMS','GDACS','ReliefWeb'],limitations:'Point measurements and forecasts differ; not certified emergency alerts.'},
 {id:'geospatial',label:'Geospatial & satellite imagery',direct:['Esri basemap and imagery metadata','Cesium viewer'],research:['Copernicus Sentinel','NASA Worldview','USGS Landsat','OpenStreetMap','VIIRS'],limitations:'Historical mosaic images have differing capture dates and native resolution; not real-time surveillance.'},
 {id:'economy',label:'Economy & GDP',direct:['World Bank WDI country indicators'],research:['IMF','OECD','UN Data','ILOSTAT','FAOSTAT','RBI','FRED'],limitations:'Annual/quarterly statistical vintages; not continuously live.'},
 {id:'finance',label:'Finance & markets',direct:['Frankfurter published currency reference rates','Nasdaq public halt notices (requires terms acceptance)','US Treasury debt-to-the-penny reporting'],research:['SEC EDGAR','Federal Reserve','ECB','SEBI','stock-exchange public disclosures'],limitations:'Reference FX is not executable tick pricing. Licensed streaming quotes are not connected.'},
 {id:'business',label:'Business & corporate',direct:['GLEIF LEI entity reference'],research:['Companies House','OpenCorporates','USPTO','WIPO','USAspending','UN Comtrade'],limitations:'LEI does not establish beneficial ownership or current solvency.'},
 {id:'governance',label:'Governance & law',direct:['Wikidata name/description search','Federal Register recently published documents','UK FCDO travel advice (supported countries only)'],research:['Congress.gov','EUR-Lex','India Gazette','UN Treaty Collection','ICJ','OFAC'],limitations:'Community reference records cannot verify current laws or officeholders. Check official published records.'},
 {id:'energy',label:'Energy & resources',direct:['NRC public daily-event feed totals (not live nuclear safety status)'],research:['EIA','IRENA','IEA public releases','Global Energy Monitor','World Bank','USGS minerals'],limitations:'Source publications have different vintages and licences.'},
 {id:'cyber',label:'Defensive cybersecurity',direct:['CISA known-exploited vulnerabilities','CISA published ICS advisory headlines'],research:['NVD','OSV','EPSS','MITRE ATT&CK','GitHub Advisories','national CERTs'],limitations:'Defensive advisories only. No intrusion, malware payloads, private assets or unauthorized vulnerability scans.'},
 {id:'health',label:'Public health & humanitarian',direct:['FEMA US disaster declaration summaries','GDACS last-24h public disaster-alert headlines'],research:['WHO Disease Outbreak News','CDC','ECDC','UNHCR','OCHA HDX','ReliefWeb'],limitations:'Published aggregate sources; no medical records or private health data.'},
 {id:'media',label:'Media & OSINT',direct:['NewsAPI headlines (when configured)','Groq browser-search research'],research:['Publisher RSS','GDELT','Wikimedia','Internet Archive','Google Fact Check Tools'],limitations:'Public publishers have delays, indexing gaps and distinct redistribution terms.'},
 {id:'reference',label:'Standards & reference',direct:['Wikidata entity search'],research:['ISO','GeoNames','UN/LOCODE','ICAO/IATA','LEI','STIX 2.1'],limitations:'Reference catalogues may be incomplete or require licence attribution.'},
 {id:'platform',label:'Analyst platform & governance',direct:['DEVASHRI 120B chat','Read-only public evidence connectors','Leaflet/Cesium visualization'],research:[],limitations:'Authentication/RBAC, permanent audit storage, full evidence graph, alerts and certified assessments are not yet production-ready.'}
];
export const DIRECT_PUBLIC_SOURCES=['economy','fx','cyber','space','business','reference'];
export function capabilitySummary(){
 return INTELLIGENCE_SECTORS.map(s=>({id:s.id,label:s.label,
  connected:s.direct,webResearch:s.research,limitations:s.limitations,
  access:s.direct.length?'partial-direct-coverage':'public-research-only'}));
}
export function compactCapabilitySummary(){
 return INTELLIGENCE_SECTORS.map(s=>({
  domain:s.label,connected:s.direct,
  researchOnly:s.research.slice(0,5),
  caveat:s.limitations
 }));
}
