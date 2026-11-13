/**
 * Curated third-party security tooling reference catalogue.
 *
 * These 50 entries are USER-SUPPLIED LINKS, NOT INSTALLED IN ASURA.
 * This module never imports, downloads, executes or proxies their binaries.
 * External GitHub links, licensing, maintainers and repository state may change.
 */
export const RED_TEAM_CATEGORIES=Object.freeze([
 {id:'emulation',name:'Command & Control (C2) & Adversary Emulation',
  intent:'Controlled adversary simulation and detection validation'},
 {id:'recon',name:'Reconnaissance & OSINT',
  intent:'Authorized attack-surface inventory and public information review'},
 {id:'scanning',name:'Web & Network Vulnerability Scanning',
  intent:'Asset-owner-approved testing and exposure triage'},
 {id:'directory',name:'Active Directory & Internal Network Exploitation',
  intent:'Identity configuration and directory exposure assessment'},
 {id:'credentials',name:'Credential Access & Privilege Escalation',
  intent:'Credential resilience and access-control assurance'},
 {id:'phishing',name:'Phishing, Initial Access & Wireless',
  intent:'Opt-in awareness exercises and wireless security assessments'},
 {id:'pivoting',name:'Pivoting, Evasion & Cloud Security',
  intent:'Authorized segmentation and cloud configuration review'},
 {id:'references',name:'AI Pentesting & Curated Reference Lists',
  intent:'Review of research automation and published references'},
]);
const entries=[
 [1,'emulation','BishopFox/sliver','Cross-platform adversary emulation and multi-session C2 framework written in Go.'],
 [2,'emulation','mitre/caldera','Automated adversary emulation platform based on MITRE ATT&CK.'],
 [3,'emulation','its-a-feature/Mythic','Collaborative, multi-platform C2 framework with customizable agents and a web UI.'],
 [4,'emulation','HavocFramework/Havoc','Post-exploitation C2 framework with malleable capabilities.'],
 [5,'emulation','BC-SECURITY/Empire','Post-exploitation and adversary emulation framework supporting multiple scripting languages.'],
 [6,'emulation','cobbr/Covenant','.NET C2 framework for security research.'],
 [7,'emulation','redcanaryco/atomic-red-team','Small, portable detection validation tests mapped to MITRE ATT&CK.'],
 [8,'emulation','Ne0nd0g/merlin','Cross-platform C2 server and agent using modern HTTP protocols.'],
 [9,'recon','owasp-amass/amass','Attack surface mapping and authorized external asset discovery.'],
 [10,'recon','projectdiscovery/subfinder','Passive subdomain enumeration.'],
 [11,'recon','laramies/theHarvester','Public-source discovery of organizational emails, subdomains and hosts.'],
 [12,'recon','smicallef/spiderfoot','Automated OSINT and attack-surface discovery.'],
 [13,'recon','sherlock-project/sherlock','Public username discovery across online services.'],
 [14,'recon','lanmaster53/recon-ng','Modular open-source web reconnaissance framework.'],
 [15,'recon','sensepost/gowitness','Headless browser screenshots for web-asset review.'],
 [16,'recon','gitleaks/gitleaks','Scanning repositories for exposed secrets and credentials.'],
 [17,'recon','trufflesecurity/trufflehog','Finding potential leaked credentials in supported sources.'],
 [18,'scanning','projectdiscovery/nuclei','Template-based vulnerability assessment scanner.'],
 [19,'scanning','projectdiscovery/httpx','HTTP probing and web-technology inventory.'],
 [20,'scanning','ffuf/ffuf','Web fuzzing for authorized directory, parameter and virtual-host testing.'],
 [21,'scanning','sqlmapproject/sqlmap','SQL injection detection and exploitation testing.'],
 [22,'scanning','commixproject/commix','Command-injection testing framework.'],
 [23,'scanning','sullo/nikto','Web server misconfiguration and exposure scanner.'],
 [24,'scanning','robertdavidgraham/masscan','High-speed TCP port scanning.'],
 [25,'directory','SpecterOps/BloodHound','Active Directory relationship and attack-path analysis.'],
 [26,'directory','fortra/impacket','Python tools for Windows network protocols including SMB, MSRPC and Kerberos.'],
 [27,'directory','Pennyw0rth/NetExec','Network service assessment automation for authorized internal networks.'],
 [28,'directory','lgandx/Responder','Network name-resolution poisoning and credential capture research.'],
 [29,'directory','dirkjanm/krbrelayx','Kerberos delegation and relay security research.'],
 [30,'directory','ly4k/Certipy','Active Directory Certificate Services assessment tools.'],
 [31,'directory','GhostPack/Rubeus','Kerberos interaction and ticket security research.'],
 [32,'directory','GhostPack/Seatbelt','Windows host security and configuration survey tools.'],
 [33,'directory','BloodHoundAD/SharpHound','Directory relationship data collection for BloodHound.'],
 [34,'credentials','gentilkiwi/mimikatz','Windows authentication material and credential security research.'],
 [35,'credentials','peass-ng/PEASS-ng','Local privilege-escalation assessment scripts for authorized hosts.'],
 [36,'credentials','AlessandroZ/LaZagne','Locally stored credential recovery research.'],
 [37,'credentials','hashcat/hashcat','GPU-accelerated offline password-strength auditing.'],
 [38,'credentials','openwall/john','Password-strength testing and recovery utility.'],
 [39,'phishing','gophish/gophish','Opt-in phishing awareness and campaign simulation framework.'],
 [40,'phishing','kgretzky/evilginx2','Credential and session-token phishing research framework.'],
 [41,'phishing','trustedsec/social-engineer-toolkit','Social-engineering test and awareness research toolkit.'],
 [42,'phishing','wifiphisher/wifiphisher','Rogue wireless access-point security testing framework.'],
 [43,'phishing','aircrack-ng/aircrack-ng','Wireless network security assessment utilities.'],
 [44,'pivoting','jpillora/chisel','TCP/UDP transport tunneling utility.'],
 [45,'pivoting','nicocha30/ligolo-ng','TUN-based network routing and pivoting utility.'],
 [46,'pivoting','RhinoSecurityLabs/pacu','AWS environment security assessment framework.'],
 [47,'pivoting','nccgroup/ScoutSuite','Multi-cloud security configuration auditing.'],
 [48,'pivoting','samratashok/nishang','PowerShell-based security research scripts and payloads.'],
 [49,'references','KeygraphHQ/shannon','Autonomous research agent for web application and API security testing.'],
 [50,'references','infosecn1nja/Red-Teaming-Toolkit','Curated open-source red-team tools and techniques reference directory.'],
];
export const RED_TEAM_TOOLS=Object.freeze(entries.map(([number,category,repository,purpose])=>
 Object.freeze({
  number,
  category,
  repository,
  name:repository.split('/')[1],
  purpose,
  url:'https://github.com/'+repository,
  status:'reference-only',
  installed:false,
  executable:false,
 })));
export const RED_TEAM_TOOL_COUNT=RED_TEAM_TOOLS.length;
export const RED_TEAM_CATEGORY_COUNT=RED_TEAM_CATEGORIES.length;
export const RED_TEAM_DISCLAIMER=
 'Repository references only: none of the third-party tools are installed, connected, approved or independently verified for live operation. Use requires explicit asset-owner authorization and provider licence review.';
export function redTeamCatalogSummary(){
 return {
  toolCount:RED_TEAM_TOOL_COUNT,
  categoryCount:RED_TEAM_CATEGORY_COUNT,
  installedCount:0,
  executableCount:0,
  source:'user-provided GitHub repository references',
  verification:'not independently verified',
  disclaimer:RED_TEAM_DISCLAIMER,
  categories:RED_TEAM_CATEGORIES.map(category=>({
   ...category,count:RED_TEAM_TOOLS.filter(item=>item.category===category.id).length
  })),
 };
}
export function getRedTeamTool(repository){
 if(typeof repository!=='string')return null;
 return RED_TEAM_TOOLS.find(item=>item.repository===repository)||null;
}
export function searchRedTeamTools(query='',category='all',limit=50){
 const term=String(query||'').trim().toLowerCase().slice(0,100);
 const cat=RED_TEAM_CATEGORIES.some(c=>c.id===category)?category:'all';
 return RED_TEAM_TOOLS.filter(item=>(cat==='all'||item.category===cat)&&
  (!term||[item.name,item.repository,item.purpose].some(s=>s.toLowerCase().includes(term))))
  .slice(0,Math.max(1,Math.min(50,Number(limit)||50)));
}
