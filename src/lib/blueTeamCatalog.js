/**
 * User-supplied open-source Blue Team reference catalogue.
 * Exactly 50 references in 8 categories. NONE are installed, authenticated,
 * monitored, or connected to ASURA by the existence of this registry.
 *
 * An upstream project may be a CLI, desktop application, ruleset, full
 * server deployment or web UI. References are not deployed software.
 */
export const BLUE_TEAM_CATEGORIES=Object.freeze([
 {id:'waf',label:'WAF & Web Edge Defense',scope:'Web edge controls and WAF testing'},
 {id:'siem',label:'SIEM, Logs & Observability',scope:'Security events and log transport'},
 {id:'dfir',label:'DFIR & Forensics',scope:'Incident artifacts and forensic analysis'},
 {id:'soar',label:'SOAR & Case Management',scope:'Triage and case workflow'},
 {id:'threat',label:'Threat Intelligence & Phishing Defense',scope:'Threat intelligence, IOCs and phishing research'},
 {id:'malware',label:'Malware Analysis & Reverse Engineering',scope:'Isolated malware research and analysis'},
 {id:'network',label:'Network Security Monitoring',scope:'Flow and packet analysis'},
 {id:'exposure',label:'Vulnerability, Assets & Deception',scope:'Vulnerability posture and authorized assets'},
]);
const rows=[
 [1,'waf','owasp-modsecurity/ModSecurity','Cross-platform web application firewall engine.','engine'],
 [2,'waf','coreruleset/coreruleset','OWASP Core Rule Set for common web application attacks.','ruleset'],
 [3,'waf','corazawaf/coraza','SecLang-compatible Go web application firewall engine.','engine'],
 [4,'waf','chaitin/SafeLine','Self-hosted web application firewall with management dashboard.','server-ui'],
 [5,'waf','openappsec/openappsec','Web application and API protection with centralized management.','server-ui'],
 [6,'waf','wallarm/gotestwaf','WAF detection evaluation and test framework.','cli'],
 [7,'waf','bunkerity/bunkerweb','Nginx-based security gateway with web management.','server-ui'],
 [8,'siem','wazuh/wazuh','Endpoint detection and SIEM platform with web dashboards.','server-ui'],
 [9,'siem','Security-Onion-Solutions/securityonion','Network security monitoring and SOC analysis platform.','server-ui'],
 [10,'siem','Graylog2/graylog2-server','Centralized log management, search and dashboards.','server-ui'],
 [11,'siem','opensearch-project/OpenSearch','Search and analytics engine; dashboards are a separate component.','server-component'],
 [12,'siem','grafana/loki','Log aggregation backend; typically visualized through Grafana.','server-component'],
 [13,'siem','fluent/fluentd','Event collection and forwarding pipeline, not a standalone SOC dashboard.','server-component'],
 [14,'siem','siglens/siglens','Searchable log management and analytics platform.','server-ui'],
 [15,'dfir','gchq/CyberChef','Browser-based data transformation and decoding toolbox.','browser'],
 [16,'dfir','Velocidex/velociraptor','Endpoint forensic visibility and investigation server.','server-ui'],
 [17,'dfir','google/timesketch','Collaborative web-based forensic timeline analysis.','server-ui'],
 [18,'dfir','google/grr','Remote endpoint forensics with central management.','server-ui'],
 [19,'dfir','sleuthkit/autopsy','Desktop forensic examination application; can export reports.','desktop'],
 [20,'dfir','mttaggart/Hindsight','Chromium history forensic artifact analysis.','desktop-cli'],
 [21,'soar','TheHive-Project/TheHive','Collaborative incident and case management platform.','server-ui'],
 [22,'soar','TheHive-Project/Cortex','Observable analysis and enrichment service.','server-ui'],
 [23,'soar','dfir-iris/iris-web','Web application for incident response case management.','server-ui'],
 [24,'soar','Shuffle/Shuffle','Visual SOAR and security workflow automation.','server-ui'],
 [25,'soar','n8n-io/n8n','Workflow automation server with web interface.','server-ui'],
 [26,'soar','TracecatHQ/tracecat','Security automation and alert triage platform.','server-ui'],
 [27,'threat','MISP/MISP','Threat intelligence exchange and indicator correlation.','server-ui'],
 [28,'threat','OpenCTI-Platform/opencti','Structured threat intelligence graph and workbench.','server-ui'],
 [29,'threat','Yeti-Platform/yeti','Threat intelligence observable enrichment and correlation.','server-ui'],
 [30,'threat','ninoseki/mihari','IOC research and monitoring framework with web frontend.','server-ui'],
 [31,'threat','ail-project/ail-framework','Open-source information leak analysis framework.','server-ui'],
 [32,'threat','urlscan/urlscan-py','Client library for URL analysis services; not a standalone web UI.','library'],
 [33,'threat','malice-plugins/virustotal','Malice ecosystem integration; not VirusTotal itself.','plugin'],
 [34,'malware','kevoreilly/CAPEv2','Malware sandbox and reporting platform; requires isolation.','server-ui'],
 [35,'malware','CERT-Polska/drakvuf-sandbox','Isolated malware detonation and dynamic analysis system.','server-ui'],
 [36,'malware','remnux/salt-states','Malware analysis workstation provisioning states.','configuration'],
 [37,'malware','Radareorg/iaito','Graphical binary analysis frontend for radare2.','desktop'],
 [38,'network','arkime/arkime','Packet capture indexing and browser-based session analysis.','server-ui'],
 [39,'network','StamusNetworks/SELKS','Suricata-based network security monitoring distribution.','server-ui'],
 [40,'network','ntop/ntopng','Network traffic and flow monitoring with web console.','server-ui'],
 [41,'network','Maltrail/maltrail','Malicious traffic detection and local reporting interface.','server-ui'],
 [42,'network','trisulnsm/trisul','Network security analytics and flow monitoring system.','server-ui'],
 [43,'exposure','DefectDojo/django-DefectDojo','Security finding and vulnerability management platform.','server-ui'],
 [44,'exposure','faradaysec/faraday','Collaborative penetration-test finding and risk management.','server-ui'],
 [45,'exposure','greenbone/gsa','Greenbone Security Assistant web application for vulnerability management.','server-ui'],
 [46,'exposure','aquasecurity/trivy','CLI vulnerability and configuration scanner; integrations provide web views.','cli'],
 [47,'exposure','fleetdm/fleet','Web-based fleet inventory and endpoint-query control plane.','server-ui'],
 [48,'exposure','telekom-security/tpotce','Isolated honeypot distribution with dashboards.','server-ui'],
 [49,'exposure','mushorg/snare','Web application honeypot; requires isolated hosting.','server-component'],
 [50,'exposure','crowdsecurity/crowdsec','Crowd-sourced security detection and remediation agent with console options.','server-component'],
];
// Published reference only. A validated integration requires each product
// to be installed, configured, explicitly authenticated and probed separately.
const exportCandidates=new Set([
 'wazuh/wazuh','Security-Onion-Solutions/securityonion','Graylog2/graylog2-server',
 'opensearch-project/OpenSearch','grafana/loki','fluent/fluentd','siglens/siglens',
 'TheHive-Project/TheHive','dfir-iris/iris-web','MISP/MISP','OpenCTI-Platform/opencti',
 'arkime/arkime','StamusNetworks/SELKS','ntop/ntopng','Maltrail/maltrail',
 'DefectDojo/django-DefectDojo','faradaysec/faraday','aquasecurity/trivy',
 'fleetdm/fleet','crowdsecurity/crowdsec'
]);
export const BLUE_TEAM_TOOLS=Object.freeze(rows.map(([number,category,repository,purpose,kind])=>
 Object.freeze({
  number,category,repository,purpose,kind,
  name:repository.split('/')[1],
  url:'https://github.com/'+repository,
  connection:'not-connected',
  integration:'reference-only',
  installed:false,healthy:null,
  offlineExportCandidate:exportCandidates.has(repository),
  note:'Not installed or verified; review official project documentation and current licence.',
 })));
export const BLUE_TEAM_COUNT=BLUE_TEAM_TOOLS.length;
export const BLUE_TEAM_INTEGRATION_STATUS=Object.freeze({
 connected:0,
 verified:0,
 managedDeployments:0,
 supportsLocalNormalizedImport:true,
 notes:'Normalized event import is supported locally. No third-party API, dashboard or daemon is connected or deployed.',
});
export function blueTeamCatalogSummary(){
 return {
  toolCount:BLUE_TEAM_COUNT,
  categories:BLUE_TEAM_CATEGORIES.map(category=>({
   ...category,count:BLUE_TEAM_TOOLS.filter(item=>item.category===category.id).length
  })),
  ...BLUE_TEAM_INTEGRATION_STATUS,
  evaluatedAt:new Date().toISOString(),
  status:'catalogue-only',
 };
}
export function searchBlueTeamTools(search='',category='all'){
 const q=String(search||'').trim().toLowerCase().slice(0,90);
 return BLUE_TEAM_TOOLS.filter(x=>(category==='all'||x.category===category)&&
  (!q||[x.repository,x.purpose,x.name].some(s=>s.toLowerCase().includes(q))));
}
