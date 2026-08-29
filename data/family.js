/**
 * Familja Luta — the family record.
 *
 * 150 people across 9 generations, from the family history written by
 * Xhafer (Lutfulla) Luta. This file is the archive; everything on the site is
 * rendered from it. It is meant to be edited BY HAND — add a person, fix a
 * date, attach a photo.
 *
 * Fields
 *   id          stable, never reuse or change one (comments are keyed to it)
 *   parent      id of the father, or null for the root
 *   gen         generation, 1–9. Must always be parent's gen + 1.
 *   branch      one of the keys in BRANCHES below
 *   name        full name as written in the source
 *   sex         'm' | 'f' — Albanian needs it for grammatical agreement
 *   years       the human-readable string, kept verbatim from the source
 *   birth/death numbers for sorting; null when unknown
 *   uncertain   true when the sources disagree — the site shows a † marker
 *   photo       filename in assets/photos/
 *   partners    spouses — { name, photo?, married?, birthPlace?, profession?,
 *               residence?, bio? }. Years stay inside the name string,
 *               verbatim: "Kismete Dobroshi (1962-1992)". Each spouse gets a
 *               page at #/person/<id>-p<index> showing the same fields as
 *               anyone else, and links and comments are keyed to that index —
 *               append a new spouse at the end, never reorder them.
 *   bio         verbatim from the family history, in the original Albanian
 *   union       which of the father's spouses this child belongs to, as an
 *               index into his `partners`. Only needed when he married more
 *               than once; the child then appears on that spouse's page too.
 *               Leave it off when the source does not say — the child still
 *               shows under the father, just under neither wife.
 *   unionNote   the same thing in the source's own words, shown as a note
 *   sourceNote  a recorded contradiction in the source document
 *
 * NOTE ON birthPlace / profession / residence: these were extracted once by
 * script from the bio prose (see scripts/build-data.mjs) and are GUESSES.
 * Correct them freely — nothing regenerates them. `union` was read once from
 * `unionNote` the same way; where the note named no wife, it was left off.
 *
 * Adding a person: give them a new unique id, set parent/gen/branch, and that
 * is all. Layout, search, counts and the map all follow automatically.
 */

export const BRANCHES = {
  "ancestral": {
    "label": "Paraardhësit",
    "series": 6
  },
  "mustafa": {
    "label": "Dega e Mustafës",
    "series": 2
  },
  "zenullah": {
    "label": "Dega e Zenullahut",
    "series": 1
  },
  "avdullah": {
    "label": "Dega e Avdullahut",
    "series": 3
  },
  "xheladin": {
    "label": "Dega e Xheladinit",
    "series": 5
  },
  "daughters": {
    "label": "Vajzat e Tahirit",
    "series": 4
  }
};

export const PEOPLE = [
  {"id":"r1","parent":null,"gen":1,"branch":"ancestral","name":"Ramazan Lutfullahu","sex":"m","years":"","birth":null,"death":null},
  {"id":"r2","parent":"r1","gen":2,"branch":"ancestral","name":"Haxhi Ramazan Lutfulla","sex":"m","years":"i njohur si Haxhi Ramë Luta","birth":null,"death":null,"birthPlace":"Pejë","bio":"Haxhi Ramë Luta pasurinë naltë cekur ka trashigu nga i ati Ramazan Lutfullahu. lindi në Pejë, më shoqën ka lindë një djal Tahirin dhe tërë pasurin ja trashigon - përcjell të birit."},
  {"id":"r3","parent":"r2","gen":3,"branch":"ancestral","name":"Tahir Haxhi Luta","sex":"m","years":"","birth":null,"death":null,"birthPlace":"Pejë","partners":[{"name":"Ryvije"},{"name":"Naile Mulhaxha"}],"bio":"Tahir Haxhi Luta lindi në Pejë, më shoqën Ryvijën linden katër djem e tri vajza, kurse më Naile Mulhaxha lindën një vajzë. Mustafën, Zenullahin, Avdullahin, Xheladinin, Qelibën, Hyrqën, Azizën dhe Zyhran."},
  {"id":"m4","parent":"r3","gen":4,"branch":"mustafa","name":"Mustafë Tahir Luta","sex":"m","years":"","birth":null,"death":null,"birthPlace":"Pejë","residence":"Bajincë","partners":[{"name":"Nixharije Sapungjiu","photo":"m4-p0.jpg"}],"bio":"Mustafë Tahir Luta lindi në Pejë më shoqën Nixharije Sapungjiu lindën tre vajza e një djal. Zymën 1990 – 1977, Lutfullahun 1903 – 1978, Sabrijën 1917 – 1978 dhe Hysnyxhylën 1921 – 1980. nga viti 1919 më familje jetoj në fshatin Bajincë dhe aty e punojë pasurin e trashiguar."},
  {"id":"z4","parent":"r3","gen":4,"branch":"zenullah","name":"Zenullah Tahir Luta","sex":"m","years":"","birth":null,"death":null,"birthPlace":"Pejë","partners":[{"name":"Gjylke"}],"bio":"Zenulla Tahir Luta lindi në Pejë, më shoqën Gjylkën lindën tre djem e një vajzë., Ramën 1907-1985, Isufin 1924- 1978, Ahmetin 1926-1997 dhe Gjylizarën 1927 – 2007.."},
  {"id":"a4","parent":"r3","gen":4,"branch":"avdullah","name":"Avdullah Tahir Luta","sex":"m","years":"","birth":null,"death":null,"birthPlace":"Pejë","partners":[{"name":"Xhemile Rugova"}],"bio":"Avdulla Tahir Luta lindi në Pejë më shoqën Xhemile Rugova lindën dy vajza Myzën 1924 dhe Shahsimenën 1928-1992."},
  {"id":"x4","parent":"r3","gen":4,"branch":"xheladin","name":"Xheladin Tahir Luta","sex":"m","years":"1892-1948","birth":1892,"death":1948,"birthPlace":"Pejë","partners":[{"name":"Hajrije Anadolli (1912-1990)"}],"bio":"Xheladin Tahir Luta lindi në Pejë 1892-1948 më shoqën Hajrije Anadolli lindur 1912-1990 lindën dy djem Selajdinin 1944-1964 dhe Xhavitin 1947. Jetoj më familje prej 1919 në fshatin Bajincë, punoi pasurin e trashiguar."},
  {"id":"q4","parent":"r3","gen":4,"branch":"daughters","name":"Qelibe Tahir Luta","sex":"f","years":"","birth":null,"death":null},
  {"id":"h4","parent":"r3","gen":4,"branch":"daughters","name":"Hyrqe Tahir Luta","sex":"f","years":"","birth":null,"death":null},
  {"id":"az4","parent":"r3","gen":4,"branch":"daughters","name":"Azize Tahir Luta","sex":"f","years":"","birth":null,"death":null},
  {"id":"zy4","parent":"r3","gen":4,"branch":"daughters","name":"Zyhra Tahir Luta","sex":"f","years":"","birth":null,"death":null,"sourceNote":"Vajza e Tahirit me Naile Mulhaxhen; shtate femijet e tjere permenden me Ryvijen."},
  {"id":"mz5","parent":"m4","gen":5,"branch":"mustafa","name":"Zyma Luta","sex":"f","years":"1900-1977","birth":1900,"death":1977,"photo":"mz5.jpg"},
  {"id":"ml5","parent":"m4","gen":5,"branch":"mustafa","name":"Lutfullah Mustafe Luta","sex":"m","years":"1903-1978","birth":1903,"death":1978,"photo":"ml5.jpg","birthPlace":"Pejë","residence":"Bajincë","partners":[{"name":"Mejreme Qavdarbasha (1913-1987)","photo":"ml5-p0.jpg"}],"bio":"Lutfulla Mustafë Luta lindi në Pejë 1903 – 1978 më shoqën Mejreme Qavdarbasha lindur në Pejë 1913 – 1987 lindën pësë djem e një vajzë., Avdullahin 1934, Alin, 1940, Melihan 1943, Xhaferin 1945, Fahrin 1947 dhe Jonuzin 1951., nga viti 1923, më familje jetoj dhe punoi pasurinë e trashiguar në fshatin Bajincë.Në vitin 1955 i mirën 99a 78m2 tokë-livalli i gjatë."},
  {"id":"ms5","parent":"m4","gen":5,"branch":"mustafa","name":"Sabrija Luta","sex":"f","years":"1917-1978","birth":1917,"death":1978,"photo":"ms5.jpg"},
  {"id":"mh5","parent":"m4","gen":5,"branch":"mustafa","name":"Hysnyxhyl Luta","sex":"m","years":"1921/22-1980 †","birth":1921,"death":1980,"uncertain":true,"photo":"mh5.jpg","sourceNote":"Viti i lindjes jepet 1921 ne pershkrim dhe 1922 ne permbledhje."},
  {"id":"zr5","parent":"z4","gen":5,"branch":"zenullah","name":"Ramë Zenullah Luta","sex":"m","years":"1907-1985","birth":1907,"death":1985,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Shahbaze Gjikolli (1913-1987)"}],"bio":"Ramë Zenulla Luta lindi në Pejë 1907-1985 më shoqën Shahbaze Gjikolli lindur 1913-1987 lindën dy djem e tri vajza, Nuradinin 1931-1990, Fadilën 1938, Viselin 1945, Fetanetën 1948-2010 dhe Refijanë 1953-1994. Më familje jetoj dhe punoj në Pejë NSH. Kombinat të kpucve."},
  {"id":"zi5","parent":"z4","gen":5,"branch":"zenullah","name":"Isuf Zenullah Luta","sex":"m","years":"1924-1978","birth":1924,"death":1978,"birthPlace":"Pejë","profession":"Vozitës kamioni","residence":"Pejë","partners":[{"name":"Hidajete Anadolli (1929-1992)"}],"bio":"Isuf Zenulla Luta lindi në Pejë 1924-1978 më dhoqën Hidajete Anadolli lindur 1929 -1992 lindën dy djem e një vajzë, Nazlijen1954, Nazimin 1956-2008 dhe Bajramin 1958-2002., më familje jetoj në Pejë, punoj si vozitës kamioni."},
  {"id":"za5","parent":"z4","gen":5,"branch":"zenullah","name":"Ahmet Zenullah Luta","sex":"m","years":"1926-1992/97 †","birth":1926,"death":1992,"uncertain":true,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Hajrije Haxhialeviq (1924-2004)"}],"bio":"Ahmet Zenulla Luta lindi në Pejë 1926-1992, më shoqën Hajrije Haxhialeviq lindur 1924-2004 lindën një djal e një vajzë, Zenullahun 1952 dhe Zinetën 1954-2013 prefesjon mjeke, më familje jetoj në Pejë dhe punoi veteran i arsimit.","sourceNote":"Viti i vdekjes jepet 1992 ne nje pjese dhe 1997 ne nje pjese tjeter."},
  {"id":"zg5","parent":"z4","gen":5,"branch":"zenullah","name":"Gjylizare Luta","sex":"f","years":"1927-2007","birth":1927,"death":2007},
  {"id":"am5","parent":"a4","gen":5,"branch":"avdullah","name":"Myza Luta","sex":"f","years":"1924","birth":1924,"death":null},
  {"id":"as5","parent":"a4","gen":5,"branch":"avdullah","name":"Shahsimene Luta","sex":"f","years":"1928-1992","birth":1928,"death":1992},
  {"id":"xs5","parent":"x4","gen":5,"branch":"xheladin","name":"Selajdin Xheladin Luta","sex":"m","years":"1943/44-1964/67 †","birth":1943,"death":1964,"uncertain":true,"sourceNote":"Vitet ndryshojne mes permbledhjes dhe pershkrimit biografik."},
  {"id":"xx5","parent":"x4","gen":5,"branch":"xheladin","name":"Xhavit Xheladin Luta","sex":"m","years":"1947","birth":1947,"death":null,"birthPlace":"fshati Bajincë","residence":"Bajincë","partners":[{"name":"Zeliha Hoxha (1950)"}],"bio":"Xhavit Xheladin Luta lindi në fshatin Bajincë 1947 më shoqën Zelihan Hoxha lindur 1950 lindën pesë vajza., Albanën 1976, Arditën1977, Arjetën 1979, Gjyljetën 1980 dhe Lejlën 1983., më familje jeton në fshatin Bajincë, shkollën fillore kreu në Banje, të mesmën ekonomike dhe shkollën e lartë komerciale në Pejë, punoj në kontabilitetin shoqeror në Istog."},
  {"id":"mav6","parent":"ml5","gen":6,"branch":"mustafa","name":"Avdullah Lutfulla Luta","sex":"m","years":"1934","birth":1934,"death":null,"photo":"mav6.jpg","birthPlace":"fshati Bajincë","profession":"Mësus","residence":"Floridë","partners":[{"name":"Lytafete Cerabregu (1934)","photo":"mav6-p0.jpg"},{"name":"Eva"}],"bio":"Avdulla Lutfulla Luta lindi në fshatin Bajincë 1934 më shoqën Lytafete Cerabregu lindur 1934 lindën tre djem e dy vajza kurse më Evën dy vajza dhe dy djem., Fikrijën 1954, Ganin 1956, Lirijën 1958, Naserin 1960, Albertin 1966, Shkollën fillore kreu në Banje kurse të mesmën për mesues në Pejë. Punoj si mësus në fshatin Novosëll, Jagodë, Dobrushë dhe Vitemericë, dy vite punoi në entin e sigurimit në Pejë. Në vitin 1968 kalonë në Amerikë dhe atje ende jeto në Floridë."},
  {"id":"mai6","parent":"ml5","gen":6,"branch":"mustafa","name":"Ali Lutfulla Luta","sex":"m","years":"1940","birth":1940,"death":null,"photo":"mai6.jpg","birthPlace":"fshati Bajincë","residence":"Beograd","partners":[{"name":"Mileva (1937)","photo":"mai6-p0.jpg"}],"bio":"Ali Lutfulla Luta lindi në fshatin Bajincë 1940 më shoqën Milevën lindur 1937 lindën një vajzë dhe një djal, Vernonën 1969 dhe Viktorin 1974 Në vitin 1965 kalon në Beograd ende jeton atje. Shkollën fillore kreu në Banjë të mesmën Gjimnazin në Pejë, kurse fakultetin juridik dhe magjistroi shkencat juridike në Beograd. Punoj në radiotelevizjon në programin e gjuhës shqipe në Beograd.Shkroi disa romane si janë.Mulliri Mitrit, Psikologjija e suksesit dhe Ledina."},
  {"id":"mme6","parent":"ml5","gen":6,"branch":"mustafa","name":"Meliha Lutfulla Luta","sex":"m","years":"1943","birth":1943,"death":null,"photo":"mme6.jpg","partners":[{"name":"Qazim Dyngjeri (1933-1997)","photo":"mme6-p0.jpg"}],"bio":"Meliha Lutfulla - Luta lindur 1943 më shokun Qazim Dyngjerin lindur 1933 - 1997 lindën dy vajza, Lulzimën 1962 dhe Naxhijën 1963."},
  {"id":"mxh6","parent":"ml5","gen":6,"branch":"mustafa","name":"Xhafer Lutfulla Luta","sex":"m","years":"1945","birth":1945,"death":null,"photo":"mxh6.jpg","birthPlace":"fshati Bajincë","profession":"Referent për qeshtje të stufentve","residence":"Pejë","partners":[{"name":"Asime Maxharaj (1953)","photo":"mxh6-p0.jpg"}],"bio":"Xhafer Lutfulla Luta lindi në fshatin Bajincë vitin 1945 më shoqën Asime Maxharaj lindur 1953 lindën tre djem, Edmondin 1976, Jetonin 1977 dhe Arjanitin 1980 Shkollën fillore kreu në Banjë, të mesmen ekonomike dhe fakultetin ekonomik në Prishtinë. Shtat vitet e para punoi si referent për qeshtje të stufentve në fakultetin ekonomiko-juridik në Prishtinë. Në vitin 1975 për hirë të gjyshës Esma Qavdarbasha lindur 1880 – 1980 më punë kalon në Pejë, ndermarjen ndertimore Ndertimtarija udheheqi këto dy vende të punës, udheheqës për plan dhe analizë gjasht vite dhe pesë vite udheheqës i kontabilitetit. Në vitin 1986 emrohët drejtor në ndermarjen për prollimin e materialit ndertimor Ringov në Pejë. Janar të vitit 1993, më aplikimin e masave te dhunshme nga politika diskriminuese serbe, parlamenti i serbis merr vendim që ta suspendoj nga posti i drejtorit dhe ta largoj nga puna. Menjehere pas përfundimit të luftës së fundit, konkretisht qershor 1999 organizon puntoret e kësaj fabrike dhe fillojnë më punë e të njejtë e udheheq deri prill 2010-së. Mars 1999 nga bandat e Milosheviqit më dhunë e nxjerin më familje nga shtepija e plaqkisin dhe e kallin shtepin. Vitet 1964 dhe 1965 qe aktor në teatrin amator të Pejës. Shkroi Historjatin e familjës Trungun familjar Luta nga Peja si dhe dy drama telivizive EMINJA dhe LOTI., ku janë përfshi ngjarjet origjinale para, gjatë dhe pas luftës së fundit, nga viti 1975 më familje jeton në Pejë."},
  {"id":"mfa6","parent":"ml5","gen":6,"branch":"mustafa","name":"Fahri Lutfulla Luta","sex":"m","years":"1947","birth":1947,"death":null,"photo":"mfa6.jpg","birthPlace":"fshati Bajincë","profession":"Vozitës","partners":[{"name":"Hava Bicaj (1949)","photo":"mfa6-p0.jpg"},{"name":"Vahide Gashi"}],"bio":"Fahri Lutfulla Luta lindi në fshatin Bajincë 1947 më shoqën Havën Bicaj e lindur1949 lindën tre djem e një vajzë, kurse më Vahidë Gashi lindur 19 linden tre djem e tri vajza, Bekimin 1970, Blerimin 1971, Agimin 1972 -, Leonorën 1974, Armendin 1978, Artonin 1981, Argentinën 1983, Aidën 1985, Albinën 1988 dhe Lutfullahun 1994. Shkollën fillore kreu në Banje dhe punoi në SHP Peshkaterija në Istog si vozitës. Jeton më familje në fshatin Bajincë."},
  {"id":"mjo6","parent":"ml5","gen":6,"branch":"mustafa","name":"Jonuz Lutfulla Luta","sex":"m","years":"1951","birth":1951,"death":null,"photo":"mjo6.jpg","birthPlace":"fshati Bajincë","partners":[{"name":"Kismete Dobroshi (1962-1992)","photo":"mjo6-p0.jpg"},{"name":"Sherife Maxharaj (1952-2006)","photo":"mjo6-p1.jpg"}],"bio":"Jonuz Lutfulla Luta lindi në fshatin Bajincë 1951 më shoqën Kismete Dobroshi lindur-1962 -1992 lindën dy djem e një vajzë, kurse më Sherife Maxharaj lindur 1952-2006 lindën dy vajza, Labinotin 1985 Lindën 1986. Agonin 1991, Gjyljetën 1994 dhe Gjentinën 1995. Shkollën fillore kre në Banje, të mesmen gjimnazin në Pejë dhe fakultetin Juridik në Prishtinë. Jeton më familje dhe punon në Pejë në NMN Ringov."},
  {"id":"zrn6","parent":"zr5","gen":6,"branch":"zenullah","name":"Nuradin Ramë Luta","sex":"m","years":"1931/33-1990 †","birth":1931,"death":1990,"uncertain":true,"birthPlace":"Pejë","partners":[{"name":"Gjylkë Hoti (1936)"}],"bio":"Nuradin Ramë Luta lindi në Pejë vitin 1933-1990 më shoqën Gjylkën Hoti lindur 1936 lindën pesë djem e dy vajza, Egjnihatin 1955-1911, Nexhedinin 1957, Nezihan 1959, Naimin 1960, Rexhepin 1963, Syndyzën 1965 dhe Skenderin 1974.","sourceNote":"Viti i lindjes jepet 1931 në përmbledhje dhe 1933 në përshkrim."},
  {"id":"zrf6","parent":"zr5","gen":6,"branch":"zenullah","name":"Fadile Luta","sex":"f","years":"1938","birth":1938,"death":null},
  {"id":"zrv6","parent":"zr5","gen":6,"branch":"zenullah","name":"Visel Ramë Luta","sex":"m","years":"1945","birth":1945,"death":null,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Sevdije Nepola (1947)"}],"bio":"Visel Ramë Luta lindi në Pejë 1945 më shoqën Sevdije Nepola. lindur 1947 lindën katër vajza dhe dy djem, Valentinën 1970, Visarën 1971, Vjollcën 1973, Vahidën 1975, Valonin 1976 dhe Fatonin 1980. Më familje jeton në Pejë dhe ka punu në Kombinat lekurëkpucve."},
  {"id":"zrt6","parent":"zr5","gen":6,"branch":"zenullah","name":"Fetanete Luta","sex":"f","years":"1948-2010","birth":1948,"death":2010},
  {"id":"zrr6","parent":"zr5","gen":6,"branch":"zenullah","name":"Refije Luta","sex":"f","years":"1950/53-1994 †","birth":1950,"death":1994,"uncertain":true,"sourceNote":"Viti i lindjes jepet 1950 ne permbledhje dhe 1953 ne pershkrim."},
  {"id":"zin6","parent":"zi5","gen":6,"branch":"zenullah","name":"Nazlije Luta","sex":"f","years":"1954","birth":1954,"death":null},
  {"id":"zizm6","parent":"zi5","gen":6,"branch":"zenullah","name":"Nazim Isuf Luta","sex":"m","years":"1956-2008 †","birth":1956,"death":2008,"uncertain":true,"birthPlace":"Pejë","profession":"Mekanik NMN Ringov","partners":[{"name":"Hatigje Mulhaxheri (1950)"}],"bio":"Nazim Isuf Luta lindi në Pejë 1956-2008 më shoqën Hatigje Mulhaxheri lindur 1950 lindën djalin Arjanin 1988.Jetoj më familje në Pejë dhe punoj si mekanik NMN Ringov.","sourceNote":"Viti i vdekjes jepet 2008 ne pershkrim; permbledhja jep 2002."},
  {"id":"zib6","parent":"zi5","gen":6,"branch":"zenullah","name":"Bajram Luta","sex":"m","years":"1958-2002 †","birth":1958,"death":2002,"uncertain":true,"sourceNote":"Viti i vdekjes jepet 2002 ne pershkrim; permbledhja jep 2000."},
  {"id":"zaz6","parent":"za5","gen":6,"branch":"zenullah","name":"Zenullah Ahmet Luta","sex":"m","years":"1952","birth":1952,"death":null,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Elvane Bukleta (1960)"}],"bio":"Zenulla Ahmet Luta lindi në Pejë 1952 më shoqën Elvane Bukleta lindur 1960 linden dy djem e dy vajza. Dardanin 1983, Krenarën 1985, Gentin 1992 dhe Gretën 1994., më familje jetonë në Pejë dhe punon, Si elektroinzhinjer në elektro distribucion."},
  {"id":"zai6","parent":"za5","gen":6,"branch":"zenullah","name":"Zineta Luta","sex":"f","years":"1954-2013","birth":1954,"death":2013},
  {"id":"xxa6","parent":"xx5","gen":6,"branch":"xheladin","name":"Albana Luta","sex":"f","years":"1976","birth":1976,"death":null},
  {"id":"xxd6","parent":"xx5","gen":6,"branch":"xheladin","name":"Ardita Luta","sex":"f","years":"1977","birth":1977,"death":null},
  {"id":"xxr6","parent":"xx5","gen":6,"branch":"xheladin","name":"Arjeta Luta","sex":"f","years":"1979","birth":1979,"death":null},
  {"id":"xxg6","parent":"xx5","gen":6,"branch":"xheladin","name":"Gjyljeta Luta","sex":"f","years":"1980","birth":1980,"death":null},
  {"id":"xxl6","parent":"xx5","gen":6,"branch":"xheladin","name":"Lejla Luta","sex":"f","years":"1983","birth":1983,"death":null},
  {"id":"mavf7","parent":"mav6","gen":7,"branch":"mustafa","name":"Fikrije Luta","sex":"f","years":"1954","birth":1954,"death":null,"union":0,"unionNote":"me Lytafete Cerabregun"},
  {"id":"mavg7","parent":"mav6","gen":7,"branch":"mustafa","name":"Gani Avdullah Luta","sex":"m","years":"1955/56 †","birth":1955,"death":null,"uncertain":true,"birthPlace":"Pejë","partners":[{"name":"Safete Haxhiajliq (1968)"}],"bio":"Gani Avdulla Luta lindi në Pejë 1956 më shoqën Safete Haxhiajliq lindur 1968 lindën tre djem e një vajzë, Eduardin 1989, Edonën 1991, Edisonin 1992 dhe Edonin 2000. Shkollën e mesme ekonomike kreu në Pejë kurse fakultetin ekonomik në Prishtinë. Më familje jeton dhe punon N.SH. Abjenti në Pejë.","union":0,"unionNote":"me Lytafete Cerabregun","sourceNote":"Viti i lindjes jepet 1955 ne permbledhje dhe 1956 ne pershkrim."},
  {"id":"mavl7","parent":"mav6","gen":7,"branch":"mustafa","name":"Lirije Luta","sex":"f","years":"1958","birth":1958,"death":null,"union":0,"unionNote":"me Lytafete Cerabregun"},
  {"id":"mavn7","parent":"mav6","gen":7,"branch":"mustafa","name":"Naser Avdullah Luta","sex":"m","years":"1960","birth":1960,"death":null,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Time Shehu (1964)"}],"bio":"Naser Avdulla Luta lindi në Pejë vitin 1960 më shoqën Time Shehu lindur 1964 lindën dy djem e një vajzë, Milotin 1984. Liridonin 1989 dhe Mirandën 1993. kreu shkollën e mesme ekonomike, më familje jeton në Pejë. Punon në lokalet e veta.","union":0,"unionNote":"me Lytafete Cerabregun"},
  {"id":"mava7","parent":"mav6","gen":7,"branch":"mustafa","name":"Albert Avdullah Luta","sex":"m","years":"1966","birth":1966,"death":null,"birthPlace":"Pejë","partners":[{"name":"Valbona Duriqi (1974)"}],"bio":"Albert Avdulla Luta lindi në Pejë vitin 1966 më shoqën Valbona Duriqi lindur 1974 lindën dy vajza e një djal, Getuardin 2000, Adrijanin 2001 dhe Gentijanën 2009. Jeton dhe punon në Suedi.","union":0,"unionNote":"me Lytafete Cerabregun"},
  {"id":"mavb7","parent":"mav6","gen":7,"branch":"mustafa","name":"Barbara Luta","sex":"f","years":"1969","birth":1969,"death":null,"union":1,"unionNote":"me Even"},
  {"id":"mavs7","parent":"mav6","gen":7,"branch":"mustafa","name":"Selami Luta","sex":"m","years":"1971","birth":1971,"death":null,"union":1,"unionNote":"me Even"},
  {"id":"mavo7","parent":"mav6","gen":7,"branch":"mustafa","name":"Omar Luta","sex":"m","years":"1973","birth":1973,"death":null,"union":1,"unionNote":"me Even"},
  {"id":"mavt7","parent":"mav6","gen":7,"branch":"mustafa","name":"Toni Luta","sex":"m","years":"1975","birth":1975,"death":null,"union":1,"unionNote":"me Even"},
  {"id":"maiv7","parent":"mai6","gen":7,"branch":"mustafa","name":"Vernona Luta","sex":"f","years":"1969","birth":1969,"death":null,"photo":"maiv7.jpg"},
  {"id":"maik7","parent":"mai6","gen":7,"branch":"mustafa","name":"Viktor Ali Luta","sex":"m","years":"1974","birth":1974,"death":null,"photo":"maik7.jpg","birthPlace":"Beograd","profession":"Inzhinjer – programer","residence":"Beograd","partners":[{"name":"Ana (1975)","photo":"maik7-p0.jpg"}],"bio":"Viktor Ali Luta lindi në Beograd 1974 më shoqën Anën lindur 1975 lindën një vajzë dhe një djal, Laurën 2005 dhe Gagin 2009, kreu shkollën fillore dhe të mesmën teknike dhe fakultetin teknik në Beograd. Më familje jeton dhe punon në Beograd si inzhinjer – programer."},
  {"id":"mmel7","parent":"mme6","gen":7,"branch":"mustafa","name":"Lulzime","sex":"f","years":"1962","birth":1962,"death":null},
  {"id":"mmen7","parent":"mme6","gen":7,"branch":"mustafa","name":"Naxhije","sex":"f","years":"1963","birth":1963,"death":null},
  {"id":"mxhe7","parent":"mxh6","gen":7,"branch":"mustafa","name":"Edmond Xhafer Luta","sex":"m","years":"1976","birth":1976,"death":null,"photo":"mxhe7.jpg","birthPlace":"Pejë","partners":[{"name":"Venera Krasniqi (1979)","photo":"mxhe7-p0.jpg"}],"bio":"Edmond Xhafer Luta lindi në Pejë vitin 1976 më shoqën Venera Krasniqi lindur 1979 linden një vajzë dhe një djal, Jonidën 2004 dhe Eronin 2007 kreu shkollën fillore, të mesmen teknike dhe fakultetin juridik në Pejë. Jeton më famile dhe punon në ministrin e punve të mbrenshme - zyrtar policor pjestar i njësis speciale - në Pejë."},
  {"id":"mxhj7","parent":"mxh6","gen":7,"branch":"mustafa","name":"Jeton Xhafer Luta","sex":"m","years":"1977","birth":1977,"death":null,"photo":"mxhj7.jpg","birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Edita Gjemajli (1979)","photo":"mxhj7-p0.jpg"}],"bio":"Jeton Xhafer Luta lindi në Pejë 1977 më shoqën Edita Gjemajli lindur 1979 lindën dy vajza, Anejën 2002 dhe Adejën 2007. Shkollën fillore dhe gjimnazin kreu në Pejë, më familje jeton dhe punon në Pejë në shoqerin hoteljere Dukagjini në vendin e punës menaxhër. Vitin 1998 dhe 1999 qe pjestar i Ushtris qlirimtare /UQK - së/ vitin 1998 dy here shkoi për armatim Shqipri."},
  {"id":"mxha7","parent":"mxh6","gen":7,"branch":"mustafa","name":"Arjanit Xhafer Luta","sex":"m","years":"1980","birth":1980,"death":null,"photo":"mxha7.jpg","birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Lendita Salihaj (1983)","photo":"mxha7-p0.jpg"}],"bio":"Arianit Xhafer Luta lindi në Pejë 1980 më shoqën Lendita Salihaj e lindur 1983 lindën djalin Deonin 2010. Shkollën fillore, të mesmen ekonomike si dhe shkollën e lartë komerciale në Pejë. Ka regjistru magistraturën. Më familje jeton dhe punon në Pejë, në Instituconin mikrofinancar, kreditimi rural i Kosovës, pozita menaxher i degës."},
  {"id":"mfb7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Bekim Fahri Luta","sex":"m","years":"1970","birth":1970,"death":null,"birthPlace":"fshati Bajincë","residence":"Zvicër","partners":[{"name":"Katarina Remi (1971)"},{"name":"Florentina Morina (1976)"}],"bio":"Bekim Fahri Luta lindi në fshatin Bajincë vitin 1970 më shoqën Katarina Remi lindur 1971 linden tre djem e një vajzë Janathanin 1994, Miremen 1998, Florjanin 1999 dhe Eduardin 2001, kurse më Florentinën Morina lindur 1976 lindën djalin Alvinin 2011 Punon dhe jeton më familje në Zvicër.","union":0,"unionNote":"femijet e pare me Haven; femijet e dyte me Vahiden"},
  {"id":"mfbl7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Blerim Fahri Luta","sex":"m","years":"1971","birth":1971,"death":null,"birthPlace":"fshati Bajincë","partners":[{"name":"Selijana (1969)"},{"name":"Aliza"}],"bio":"Blerim Fahri Luta lindi në fshatin Bajincë vitin 1971 më shoqën Selijanën e lindur 1969 lindën vajzën Eludijën 1992 kurse më Alizën lindur 19 linden vajzën Atinën 2002. Jeton më familje dhe punon në Zvicër.","union":0,"unionNote":"me Hava Bicajn"},
  {"id":"mfg7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Agim Fahri Luta","sex":"m","years":"1972","birth":1972,"death":null,"birthPlace":"fshati Bajincë","partners":[{"name":"Fatme"}],"bio":"Agim Fahri Luta lindi në fshatin Bajincë 1972 më shoqën Fatmën lindën djalin Libatin 2009. Jeton dhe punon në Zvicër.","union":0,"unionNote":"me Hava Bicajn"},
  {"id":"mfl7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Leonora Luta","sex":"f","years":"1974","birth":1974,"death":null,"union":0,"unionNote":"me Hava Bicajn"},
  {"id":"mfar7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Armend Fahri Luta","sex":"m","years":"1978","birth":1978,"death":null,"birthPlace":"fshati Bajincë","residence":"Bajincë","partners":[{"name":"Vjollca"}],"bio":"Armend Fahri Luta lindi në fshatin Bajincë vitin 1978 më shoqën Vjollcën b. Lindur 19 lindën dy vajza e një djal Më familje jetom më fshatin Bajincë dhe punon në SH.P Peshkatarija si vozitës.","union":1,"unionNote":"me Vahide Gashin"},
  {"id":"mfat7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Arton Fahri Luta","sex":"m","years":"1981","birth":1981,"death":null,"birthPlace":"fshati Bajincë","bio":"Arton Fahri Luta lindi në fshatin Bajincë vitin 19 më shoqën ab lindën vajzën. Më familje dhe punon në Zvicër.","union":1,"unionNote":"me Vahide Gashin"},
  {"id":"mfarg7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Argentina Luta","sex":"f","years":"1983","birth":1983,"death":null,"union":1,"unionNote":"me Vahide Gashin"},
  {"id":"mfaid7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Aida Luta","sex":"f","years":"1985","birth":1985,"death":null,"union":1,"unionNote":"me Vahide Gashin"},
  {"id":"mfalb7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Albina Luta","sex":"f","years":"1988","birth":1988,"death":null,"union":1,"unionNote":"me Vahide Gashin"},
  {"id":"mflut7","parent":"mfa6","gen":7,"branch":"mustafa","name":"Lutfullah Fahri Luta","sex":"m","years":"1994","birth":1994,"death":null,"union":1,"unionNote":"me Vahide Gashin"},
  {"id":"mjol7","parent":"mjo6","gen":7,"branch":"mustafa","name":"Labinot Luta","sex":"m","years":"1985","birth":1985,"death":null,"photo":"mjol7.jpg","union":0,"unionNote":"me Kismete Dobroshin"},
  {"id":"mjoli7","parent":"mjo6","gen":7,"branch":"mustafa","name":"Linda Luta","sex":"f","years":"1986","birth":1986,"death":null,"photo":"mjoli7.jpg","union":0,"unionNote":"me Kismete Dobroshin"},
  {"id":"mjoa7","parent":"mjo6","gen":7,"branch":"mustafa","name":"Agon Luta","sex":"m","years":"1991","birth":1991,"death":null,"photo":"mjoa7.jpg","union":0,"unionNote":"me Kismete Dobroshin"},
  {"id":"mjog7","parent":"mjo6","gen":7,"branch":"mustafa","name":"Gjyljeta Luta","sex":"f","years":"1994","birth":1994,"death":null,"photo":"mjog7.jpg","union":1,"unionNote":"me Sherife Maxharajn"},
  {"id":"mjogt7","parent":"mjo6","gen":7,"branch":"mustafa","name":"Gjentina Luta","sex":"f","years":"1995","birth":1995,"death":null,"photo":"mjogt7.jpg","union":1,"unionNote":"me Sherife Maxharajn"},
  {"id":"zrne7","parent":"zrn6","gen":7,"branch":"zenullah","name":"Egjnihat Nuradin Luta","sex":"m","years":"1954/55 †","birth":1954,"death":null,"uncertain":true,"birthPlace":"Pejë","profession":"Automekanik","residence":"Pejë","partners":[{"name":"Remzije Nimani (1954)"}],"bio":"Exhnihat Nuradin Luta lindi në Pejë vitin 1955-1911 më shoqën Remzije Nimani lindur 1954 lindën Meritën 1975, Jaserin 1977, Allmën 1982 dhe Djellzën 1988. Më familje jetoj në Pejë dhe punoj si automekanik në lokalin e vetë.","sourceNote":"Viti i lindjes ndryshon mes pjeseve; shenimi 1911 si vit vdekjeje duket gabim ne burim."},
  {"id":"zrnn7","parent":"zrn6","gen":7,"branch":"zenullah","name":"Nexhmedin Nuradin Luta","sex":"m","years":"1957","birth":1957,"death":null,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Negjmije Mulla (1959)"}],"bio":"Nexhmedin Nuradin Luta lindi në Pejë vitin 1957 - më shoqën Negjmije Mulla lindur 1959 lindën Elginin 1983, dhe Vitën 1993. Më familje jeton në Pejë dhe punon automeksnik në lokal të vetë."},
  {"id":"zrnz7","parent":"zrn6","gen":7,"branch":"zenullah","name":"Neziha Luta","sex":"f","years":"1959","birth":1959,"death":null},
  {"id":"zrnna7","parent":"zrn6","gen":7,"branch":"zenullah","name":"Naim Nuradin Luta","sex":"m","years":"1960","birth":1960,"death":null,"residence":"Pejë","partners":[{"name":"Vjosa Gashi (1979)"}],"bio":"Naim Nuradin Luta ka lindë në Pejë 1960 më shoqën Vjosa Gashi lindur 1979 lindën Gramosin 1982, Ariellën 1984 dhe Gentin 1998. Më familje jeton në Pejë punon automekanik në lokalin e vetë."},
  {"id":"zrnr7","parent":"zrn6","gen":7,"branch":"zenullah","name":"Rexhep Nuradin Luta","sex":"m","years":"1963","birth":1963,"death":null,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Fikrije Ibishi (1972)"}],"bio":"Rexhep Nuradin Luta lindi në Pejë vitin 1963 më shoqën Fikrije Ibishi lindur vitin 1972 lindën Eronin 1999, Elzën 2000 dhe Edonisin 2007. Më familje jeton në Pejë dhe punon automekanik në lokalin e vetë."},
  {"id":"zrns7","parent":"zrn6","gen":7,"branch":"zenullah","name":"Syndyze Luta","sex":"f","years":"1965","birth":1965,"death":null},
  {"id":"zrnsk7","parent":"zrn6","gen":7,"branch":"zenullah","name":"Skender Nuradin Luta","sex":"m","years":"1974","birth":1974,"death":null,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Arbresha Belegu (1978)"}],"bio":"Skender Nuradin Luta lindi në Pejë 1974 më shoqën Arbresha Belegu lindur 1978 lindën Egzonin 2000 dhe Anilën 2003., më familje jeton në Pejë, dhe punon automekanik në lokalin e vrtë."},
  {"id":"zrvva7","parent":"zrv6","gen":7,"branch":"zenullah","name":"Valentina Luta","sex":"f","years":"1970","birth":1970,"death":null},
  {"id":"zrvvi7","parent":"zrv6","gen":7,"branch":"zenullah","name":"Visara Luta","sex":"f","years":"1971","birth":1971,"death":null},
  {"id":"zrvvj7","parent":"zrv6","gen":7,"branch":"zenullah","name":"Vjollca Luta","sex":"f","years":"1973","birth":1973,"death":null},
  {"id":"zrvvh7","parent":"zrv6","gen":7,"branch":"zenullah","name":"Vahide Luta","sex":"f","years":"1975","birth":1975,"death":null},
  {"id":"zrvvo7","parent":"zrv6","gen":7,"branch":"zenullah","name":"Valon Luta","sex":"m","years":"1976","birth":1976,"death":null},
  {"id":"zrvf7","parent":"zrv6","gen":7,"branch":"zenullah","name":"Faton Visel Luta","sex":"m","years":"1980","birth":1980,"death":null,"birthPlace":"Pejë","residence":"Pejë","partners":[{"name":"Anita Krasniqi (1981)"}],"bio":"Faton Visel Luta lindi në Pejë 1980 më shoqën Anita Krasniqi lindur 1981 lindën vajzën Teutën 2012, më familje jeton në Pejë,"},
  {"id":"zizmar7","parent":"zizm6","gen":7,"branch":"zenullah","name":"Arjan Nazim Luta","sex":"m","years":"1988","birth":1988,"death":null,"birthPlace":"Pejë","bio":"Arjan Nazim Luta lindi në Pejë 1988 kreu shkollë e mesme dhe fakultetin në Prishtinë dhe punon në Bankë."},
  {"id":"zazd7","parent":"zaz6","gen":7,"branch":"zenullah","name":"Dardan Zenullah Luta","sex":"m","years":"1983","birth":1983,"death":null,"birthPlace":"Pejë","partners":[{"name":"Teuta Kurti (1986)"}],"bio":"Dardan Zenulla Luta lindi në Pejë 1983 më shoqën Teuta Kurti lindur 1986 lindën një vajzë Ajën 2013."},
  {"id":"zazk7","parent":"zaz6","gen":7,"branch":"zenullah","name":"Krenare Luta","sex":"f","years":"1985","birth":1985,"death":null},
  {"id":"zazg7","parent":"zaz6","gen":7,"branch":"zenullah","name":"Genti Luta","sex":"m","years":"1992","birth":1992,"death":null},
  {"id":"zazgr7","parent":"zaz6","gen":7,"branch":"zenullah","name":"Greta Luta","sex":"f","years":"1994","birth":1994,"death":null},
  {"id":"mavge8","parent":"mavg7","gen":8,"branch":"mustafa","name":"Eduard Luta","sex":"m","years":"1989","birth":1989,"death":null,"photo":"mavge8.jpg"},
  {"id":"mavgo8","parent":"mavg7","gen":8,"branch":"mustafa","name":"Edona Luta","sex":"f","years":"1991","birth":1991,"death":null},
  {"id":"mavgs8","parent":"mavg7","gen":8,"branch":"mustafa","name":"Edison Luta","sex":"m","years":"1992","birth":1992,"death":null},
  {"id":"mavgn8","parent":"mavg7","gen":8,"branch":"mustafa","name":"Edon Luta","sex":"m","years":"2000","birth":2000,"death":null},
  {"id":"mavnm8","parent":"mavn7","gen":8,"branch":"mustafa","name":"Milot Naser Luta","sex":"m","years":"1983/84 †","birth":1983,"death":null,"uncertain":true,"birthPlace":"Pejë","profession":"Frizër","partners":[{"name":"Nergjivane Nexhati (1984)"},{"name":"Ardita Kelmendi (1984)"}],"bio":"Milot Naser Luta lindi në Pejë 1984 më shoqën Nergjivane Nexhati lindur 1984 lindën një djal e një vajzë, kurse më Arditën Kelmendi lindur 1984 lindën një vajzë, Edrën 2001, Leandrën 2008 dhe Risanin 2013. Jeton dhe punon në Pejë si frizër.","sourceNote":"Viti i lindjes jepet 1983 ne permbledhje dhe 1984 ne pershkrim."},
  {"id":"mavnl8","parent":"mavn7","gen":8,"branch":"mustafa","name":"Liridon Luta","sex":"m","years":"1989","birth":1989,"death":null},
  {"id":"mavnr8","parent":"mavn7","gen":8,"branch":"mustafa","name":"Miranda Luta","sex":"f","years":"1993","birth":1993,"death":null},
  {"id":"mavag8","parent":"mava7","gen":8,"branch":"mustafa","name":"Getuard Luta","sex":"m","years":"2000","birth":2000,"death":null},
  {"id":"mavaa8","parent":"mava7","gen":8,"branch":"mustafa","name":"Adrijan Luta","sex":"m","years":"2001","birth":2001,"death":null},
  {"id":"mavaj8","parent":"mava7","gen":8,"branch":"mustafa","name":"Gentijana Luta","sex":"f","years":"2009","birth":2009,"death":null},
  {"id":"maikl8","parent":"maik7","gen":8,"branch":"mustafa","name":"Laura Luta","sex":"f","years":"2005","birth":2005,"death":null,"photo":"maikl8.jpg"},
  {"id":"maikg8","parent":"maik7","gen":8,"branch":"mustafa","name":"Gagi Luta","sex":"m","years":"2009","birth":2009,"death":null,"photo":"maikg8.jpg"},
  {"id":"mxhej8","parent":"mxhe7","gen":8,"branch":"mustafa","name":"Jonida Luta","sex":"f","years":"2004","birth":2004,"death":null,"photo":"mxhej8.jpg"},
  {"id":"mxhee8","parent":"mxhe7","gen":8,"branch":"mustafa","name":"Eron Luta","sex":"m","years":"2007","birth":2007,"death":null,"photo":"mxhee8.jpg"},
  {"id":"mxhja8","parent":"mxhj7","gen":8,"branch":"mustafa","name":"Anea Luta","sex":"f","years":"2002","birth":2002,"death":null,"photo":"mxhja8.jpg"},
  {"id":"mxhjd8","parent":"mxhj7","gen":8,"branch":"mustafa","name":"Adea Luta","sex":"f","years":"2007","birth":2007,"death":null,"photo":"mxhjd8.jpg"},
  {"id":"mxhjt8","parent":"mxhj7","gen":8,"branch":"mustafa","name":"Tea Luta","sex":"f","years":"2017 †","birth":2017,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhjen e gjeneratave, por jo ne paragrafin biografik te Jetonit."},
  {"id":"mxhad8","parent":"mxha7","gen":8,"branch":"mustafa","name":"Deon Luta","sex":"m","years":"2010","birth":2010,"death":null,"photo":"mxhad8.jpg"},
  {"id":"mxhah8","parent":"mxha7","gen":8,"branch":"mustafa","name":"Hana Luta","sex":"f","years":"2016 †","birth":2016,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhjen e gjeneratave, por jo ne paragrafin biografik te Arjanitit."},
  {"id":"mfbj8","parent":"mfb7","gen":8,"branch":"mustafa","name":"Jonathan Luta","sex":"m","years":"1994","birth":1994,"death":null,"union":0,"unionNote":"me Katarina Remin"},
  {"id":"mfbm8","parent":"mfb7","gen":8,"branch":"mustafa","name":"Mireme Luta","sex":"f","years":"1998","birth":1998,"death":null,"union":0,"unionNote":"me Katarina Remin"},
  {"id":"mfbf8","parent":"mfb7","gen":8,"branch":"mustafa","name":"Florjan Luta","sex":"m","years":"1999","birth":1999,"death":null,"union":0,"unionNote":"me Katarina Remin"},
  {"id":"mfbe8","parent":"mfb7","gen":8,"branch":"mustafa","name":"Eduard Luta","sex":"m","years":"2001","birth":2001,"death":null,"union":0,"unionNote":"me Katarina Remin"},
  {"id":"mfba8","parent":"mfb7","gen":8,"branch":"mustafa","name":"Alvin Luta","sex":"m","years":"2011","birth":2011,"death":null,"union":1,"unionNote":"me Florentina Morinen"},
  {"id":"mfble8","parent":"mfbl7","gen":8,"branch":"mustafa","name":"Eludije Luta","sex":"f","years":"1992","birth":1992,"death":null,"union":0,"unionNote":"me Selijanen"},
  {"id":"mfbla8","parent":"mfbl7","gen":8,"branch":"mustafa","name":"Atina Luta","sex":"f","years":"2002","birth":2002,"death":null,"union":1,"unionNote":"me Alizen"},
  {"id":"mfgl8","parent":"mfg7","gen":8,"branch":"mustafa","name":"Libat Luta","sex":"m","years":"2009","birth":2009,"death":null},
  {"id":"mfarb8","parent":"mfar7","gen":8,"branch":"mustafa","name":"Brikenda Luta","sex":"f","years":"2002 †","birth":2002,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhje; biografia e Armendit nuk i rendit emrat e femijeve."},
  {"id":"mfarbl8","parent":"mfar7","gen":8,"branch":"mustafa","name":"Blenda Luta","sex":"f","years":"2004 †","birth":2004,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhje; biografia e Armendit nuk i rendit emrat e femijeve."},
  {"id":"mfara8","parent":"mfar7","gen":8,"branch":"mustafa","name":"Arnes Luta","sex":"m","years":"2006 †","birth":2006,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhje; biografia e Armendit nuk i rendit emrat e femijeve."},
  {"id":"mfare8","parent":"mfar7","gen":8,"branch":"mustafa","name":"Eron Luta","sex":"m","years":"2015 †","birth":2015,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhje; biografia e Armendit nuk i rendit emrat e femijeve."},
  {"id":"mfarr8","parent":"mfar7","gen":8,"branch":"mustafa","name":"Roana Luta","sex":"f","years":"2021 †","birth":2021,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhje; biografia e Armendit nuk i rendit emrat e femijeve."},
  {"id":"mfatg8","parent":"mfat7","gen":8,"branch":"mustafa","name":"Gentiana Luta","sex":"f","years":"1999 †","birth":1999,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhje; biografia e Artonit nuk i rendit emrat."},
  {"id":"mfata8","parent":"mfat7","gen":8,"branch":"mustafa","name":"Ariana Luta","sex":"f","years":"2001 †","birth":2001,"death":null,"uncertain":true,"sourceNote":"Permendet ne permbledhje; biografia e Artonit nuk i rendit emrat."},
  {"id":"mfatl8","parent":"mfat7","gen":8,"branch":"mustafa","name":"Leonita Luta","sex":"f","years":"","birth":null,"death":null,"sourceNote":"Permendet ne permbledhje pa vit lindjeje."},
  {"id":"mfate8","parent":"mfat7","gen":8,"branch":"mustafa","name":"Eleonor Luta","sex":"m","years":"","birth":null,"death":null,"sourceNote":"Permendet ne permbledhje pa vit lindjeje."},
  {"id":"mflute8","parent":"mflut7","gen":8,"branch":"mustafa","name":"Eduard Luta","sex":"m","years":"2020 †","birth":2020,"death":null,"uncertain":true,"sourceNote":"Permendet vetem ne permbledhjen e gjeneratave."},
  {"id":"mflutd8","parent":"mflut7","gen":8,"branch":"mustafa","name":"Doard Luta","sex":"m","years":"2021 †","birth":2021,"death":null,"uncertain":true,"sourceNote":"Permendet vetem ne permbledhjen e gjeneratave."},
  {"id":"zrnem8","parent":"zrne7","gen":8,"branch":"zenullah","name":"Merite Luta","sex":"f","years":"1975","birth":1975,"death":null},
  {"id":"zrnej8","parent":"zrne7","gen":8,"branch":"zenullah","name":"Jaser Luta","sex":"m","years":"1977","birth":1977,"death":null},
  {"id":"zrnea8","parent":"zrne7","gen":8,"branch":"zenullah","name":"Allme Luta","sex":"f","years":"1982","birth":1982,"death":null},
  {"id":"zrned8","parent":"zrne7","gen":8,"branch":"zenullah","name":"Djellze Luta","sex":"f","years":"1988","birth":1988,"death":null},
  {"id":"zrnne8","parent":"zrnn7","gen":8,"branch":"zenullah","name":"Elgin Luta","sex":"m","years":"1983","birth":1983,"death":null},
  {"id":"zrnnv8","parent":"zrnn7","gen":8,"branch":"zenullah","name":"Vita Luta","sex":"f","years":"1993","birth":1993,"death":null},
  {"id":"zrnng8","parent":"zrnna7","gen":8,"branch":"zenullah","name":"Gramos Luta","sex":"m","years":"1982 †","birth":1982,"death":null,"uncertain":true,"sourceNote":"Viti eshte transkriptuar sipas burimit; kronologjia familjare mund te kerkoje verifikim."},
  {"id":"zrnnaa8","parent":"zrnna7","gen":8,"branch":"zenullah","name":"Ariella Luta","sex":"f","years":"1984","birth":1984,"death":null},
  {"id":"zrnngt8","parent":"zrnna7","gen":8,"branch":"zenullah","name":"Genti Luta","sex":"m","years":"1998","birth":1998,"death":null},
  {"id":"zrnre8","parent":"zrnr7","gen":8,"branch":"zenullah","name":"Eron Luta","sex":"m","years":"1999","birth":1999,"death":null},
  {"id":"zrnrel8","parent":"zrnr7","gen":8,"branch":"zenullah","name":"Elza Luta","sex":"f","years":"2000","birth":2000,"death":null},
  {"id":"zrnred8","parent":"zrnr7","gen":8,"branch":"zenullah","name":"Edonis Luta","sex":"m","years":"2007","birth":2007,"death":null},
  {"id":"zrnske8","parent":"zrnsk7","gen":8,"branch":"zenullah","name":"Egzon Luta","sex":"m","years":"2000","birth":2000,"death":null},
  {"id":"zrnska8","parent":"zrnsk7","gen":8,"branch":"zenullah","name":"Anila Luta","sex":"f","years":"2003","birth":2003,"death":null},
  {"id":"zrvft8","parent":"zrvf7","gen":8,"branch":"zenullah","name":"Teuta / Tuana Luta","sex":"f","years":"2012 †","birth":2012,"death":null,"uncertain":true,"sourceNote":"Emri jepet Teuta ne pershkrim dhe Tuana ne permbledhje."},
  {"id":"zazda8","parent":"zazd7","gen":8,"branch":"zenullah","name":"Aja Luta","sex":"f","years":"2013","birth":2013,"death":null},
  {"id":"mavnme9","parent":"mavnm8","gen":9,"branch":"mustafa","name":"Edra Luta","sex":"f","years":"2001/07 †","birth":2001,"death":null,"uncertain":true,"sourceNote":"Viti i lindjes jepet 2001 ne pershkrim dhe 2007 ne permbledhje."},
  {"id":"mavnml9","parent":"mavnm8","gen":9,"branch":"mustafa","name":"Leandra Luta","sex":"f","years":"2008","birth":2008,"death":null},
  {"id":"mavnmr9","parent":"mavnm8","gen":9,"branch":"mustafa","name":"Risani Luta","sex":"m","years":"2013","birth":2013,"death":null}
];

/** Root of the tree — the one person with no recorded father. */
export const ROOT_ID = "r1";
