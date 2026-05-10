Document de proiectare arhitecturala
Platforma de online banking.
Disciplina
Proiectare arhitecturala
Proiect
Platforma de online banking
Document
Architectural Design Document (ADD)
Versiune
v1.0 - propunere initiala bazata pe documentul de specificatie



1. Introducere
Acest document descrie arhitectura propusa pentru platforma de online banking definita in documentul de specificatie. Rolul sau este de a transpune cerintele functionale si nefunctionale intr-o structura tehnica clara, organizata si usor de implementat.
Documentul prezinta modul in care sistemul este impartit in subsisteme principale, responsabilitatile fiecaruia si interactiunile dintre acestea. Sunt descrise, de asemenea, regulile de comunicare dintre componente, mecanismele de securitate utilizate, modul de gestionare a datelor si principiile generale care stau la baza implementarii aplicatiei.
In plus, documentul ofera o imagine de ansamblu asupra modului in care sistemul va functiona din punct de vedere tehnic, astfel incat sa existe o intelegere clara a structurii si a deciziilor arhitecturale. Acesta contribuie la organizarea dezvoltarii si la asigurarea unei coerente intre diferitele parti ale aplicatiei.
Arhitectura propusa urmareste cateva obiective esentiale: asigurarea unui nivel ridicat de securitate pentru operatiile financiare, mentinerea consistentei datelor in conditii de acces simultan si posibilitatea de extindere ulterioara a sistemului fara modificari majore asupra componentelor existente.

1.1 Scopul sistemului
Sistemul are ca scop oferirea utilizatorilor accesului digital la servicii bancare esentiale, prin intermediul unei platforme moderne si securizate. Aplicatia permite realizarea unor operatiuni precum autentificarea in sistem, vizualizarea conturilor si a soldurilor, consultarea istoricului de tranzactii, efectuarea de transferuri, administrarea cardurilor si generarea extraselor de cont.
Platforma este destinata atat utilizatorilor finali, care interactioneaza direct cu aplicatia, cat si personalului administrativ, care are acces la un modul separat pentru monitorizarea activitatii, consultarea jurnalelor de audit si investigarea eventualelor probleme sau alerte.
Aplicatia este conceputa astfel incat sa poata fi accesata de pe mai multe tipuri de dispozitive, in special prin intermediul unei interfete web sau desktop.
Din punct de vedere tehnic, sistemul este organizat astfel incat sa asigure o functionare corecta si sigura a operatiunilor financiare, chiar si in conditii de acces simultan sau volume mari de cereri. Sunt utilizate mecanisme specifice pentru prevenirea erorilor, protejarea datelor si asigurarea unei experiente stabile pentru utilizatori.
Prin aceasta abordare, sistemul ofera o solutie coerenta si usor de utilizat pentru gestionarea operatiunilor bancare, punand accent pe securitate, claritate si fiabilitate.

1.2 Definitii si acronime
MFA (Multi-Factor Authentication) – metoda de autentificare care utilizeaza mai multi factori pentru verificarea identitatii utilizatorului, de exemplu parola si un cod primit prin SMS sau generat de o aplicatie.
Step-up authentication – mecanism de securitate prin care se solicita o verificare suplimentara in cazul operatiunilor sensibile, cum ar fi efectuarea unui transfer sau modificarea setarilor importante.
Ledger / double-entry – model de evidenta contabila in care fiecare tranzactie este inregistrata prin doua operatii corelate, debit si credit, asigurand corectitudinea si trasabilitatea datelor.
Idempotency – proprietate a unei operatii prin care executarea repetata a aceleiasi cereri produce acelasi rezultat, prevenind astfel procesarea duplicata a tranzactiilor.
Audit log – jurnal al evenimentelor importante din sistem, utilizat pentru monitorizare, securitate si investigarea activitatilor suspecte.
Fraud scoring – proces de evaluare a riscului unei tranzactii pe baza unor reguli sau criterii configurabile, cu scopul identificarii operatiunilor potential frauduloase.
RBAC (Role-Based Access Control) – model de control al accesului in care drepturile utilizatorilor sunt determinate de rolurile asociate acestora.
API (Application Programming Interface) – interfata software utilizata pentru comunicarea dintre diferite componente sau subsisteme ale aplicatiei.

1.3 Documente de referinta
Documentul de specificatie a cerintelor pentru proiectul de online banking.
Sablonul Architectural Design Document pus la dispozitie pentru laborator.
Materialele de curs privind diagrame UML de clase, componente si distributie.


2. Obiective de proiectare
Arhitectura sistemului este definita astfel incat sa raspunda cerintelor nefunctionale stabilite in etapa de analiza. In continuare sunt prezentate principalele obiective de proiectare, impreuna cu metodele tehnice prin care acestea sunt atinse.
Securitate
Sistemul trebuie sa asigure un nivel ridicat de securitate pentru datele utilizatorilor si pentru operatiile financiare. Pentru atingerea acestui obiectiv, sunt utilizate mai multe mecanisme complementare.
Comunicatia dintre client si server este realizata exclusiv prin conexiuni securizate HTTPS, folosind protocolul TLS, astfel incat datele transmise sa nu poata fi interceptate sau modificate. Parolele utilizatorilor nu sunt stocate in forma text, ci sunt procesate folosind algoritmi de hashing (de exemplu bcrypt), ceea ce previne accesul neautorizat chiar si in cazul unei brese de securitate.
Autentificarea utilizatorilor include suport pentru MFA, astfel incat accesul in sistem sa necesite mai mult decat o parola. Pentru operatiile sensibile, cum ar fi transferurile de bani sau modificarile importante, este utilizat mecanismul de step-up authentication, care adauga un nivel suplimentar de verificare.
Controlul accesului la resurse este realizat prin RBAC, fiecare utilizator avand drepturi in functie de rolul sau. In plus, toate operatiile importante sunt inregistrate in audit log, ceea ce permite detectarea si investigarea activitatilor suspecte.
Corectitudine tranzactionala
Un obiectiv esential al sistemului este procesarea corecta a tranzactiilor financiare, fara erori sau inconsistente. Pentru aceasta, sistemul utilizeaza un model de tip double-entry, in care fiecare tranzactie este inregistrata prin doua operatii corelate (debit si credit).
Operatiile asupra bazei de date sunt realizate folosind tranzactii ACID, astfel incat sa fie garantata atomicitatea si consistenta datelor. In cazul in care o operatie esueaza, aceasta este anulata complet, evitand aparitia unor stari inconsistente.
Pentru prevenirea executarii duplicate a aceleiasi operatii, sistemul utilizeaza mecanisme de idempotency. Fiecare cerere sensibila este asociata unei chei unice, iar daca aceeasi cerere este retrimisa, sistemul recunoaste operatia si returneaza rezultatul anterior fara a o executa din nou.
De asemenea, sunt utilizate mecanisme de control al concurentei pentru a preveni situatiile in care mai multe operatii simultane afecteaza acelasi cont.
Modularitate
Sistemul este proiectat sub forma unui set de subsisteme independente logic, fiecare avand responsabilitati clare. Printre aceste subsisteme se numara autentificarea, gestionarea conturilor, procesarea tranzactiilor, notificarea si administrarea.
Fiecare subsistem comunica cu celelalte prin interfete bine definite (API-uri), ceea ce permite dezvoltarea si testarea lor separata. Aceasta abordare reduce complexitatea sistemului si permite modificarea sau extinderea unor componente fara a afecta restul aplicatiei.
Structurarea modulara permite, de asemenea, separarea clara a logicii de business de partea de prezentare si de persistenta datelor, ceea ce contribuie la o mai buna organizare a codului.
Scalabilitate si performanta
Sistemul este proiectat astfel incat sa poata gestiona un numar mare de utilizatori si cereri fara degradarea semnificativa a performantelor. Pentru aceasta, componentele care nu pastreaza stare (stateless) pot fi replicate, permitand distribuirea incarcarii intre mai multe instante.
Pentru reducerea timpilor de raspuns, sunt utilizate mecanisme de caching, de exemplu prin Redis, pentru stocarea temporara a datelor frecvent accesate. De asemenea, anumite operatii, precum trimiterea notificarilor, sunt realizate asincron, astfel incat sa nu blocheze executia operatiilor principale.
Interogarile bazei de date sunt optimizate pentru a reduce latenta, iar accesul la resurse este gestionat eficient pentru a evita supraincarcarea sistemului.
Disponibilitate si observabilitate
Sistemul trebuie sa fie disponibil pentru utilizatori pe perioade cat mai lungi de timp si sa permita detectarea rapida a problemelor. Pentru aceasta, sunt implementate mecanisme de logging centralizat, care inregistreaza evenimentele importante din sistem.
De asemenea, sunt colectate metrici privind performanta si utilizarea sistemului, care permit monitorizarea comportamentului aplicatiei in timp real. In cazul aparitiei unor erori, acestea sunt inregistrate si pot fi analizate pentru identificarea cauzelor.
Pentru serviciile auxiliare, sunt utilizate politici de retry controlat, astfel incat erorile temporare sa poata fi gestionate automat fara impact major asupra utilizatorilor.
Mentenabilitate
Arhitectura sistemului este conceputa astfel incat sa permita modificarea si extinderea usoara a aplicatiei. Codul este organizat pe straturi si module, fiecare avand responsabilitati bine definite.
Interfetele dintre componente sunt stabilite clar, ceea ce permite inlocuirea sau actualizarea unor parti ale sistemului fara a afecta restul aplicatiei. De asemenea, sunt utilizate conventii clare de dezvoltare si denumire, pentru a mentine consistenta codului.
Sistemul permite testarea izolata a componentelor, ceea ce faciliteaza identificarea si corectarea erorilor.



3. Arhitectura propusa - prezentare generala
Arhitectura propusa este una modulara, organizata pe straturi, in care exista o separare clara intre partea de client, stratul de acces API, serviciile de business, persistenta datelor si integrarile externe. Aceasta organizare permite structurarea aplicatiei intr-un mod logic si usor de inteles, fiecare componenta avand un rol bine definit si responsabilitati clare.
Aplicatia poate fi implementata initial ca un sistem unitar, dar structurat intern pe module distincte. Aceasta abordare permite dezvoltarea rapida a unei versiuni functionale, pastrand in acelasi timp posibilitatea de a separa ulterior anumite componente in servicii independente, daca este necesar. Prin definirea clara a limitelor dintre subsisteme, se obtine o mai buna delimitare a responsabilitatilor si o reducere a dependintelor dintre componente.
Structura modulara contribuie la o mentenanta mai usoara a aplicatiei, deoarece modificarile pot fi realizate local, fara a afecta intregul sistem. In acelasi timp, testarea devine mai eficienta, fiecare componenta putand fi verificata separat. Aceasta organizare permite si extinderea treptata a platformei, prin adaugarea de noi functionalitati sau integrarea unor servicii externe, fara a necesita schimbari majore in arhitectura existenta.
Separarea pe straturi aduce si beneficii din punct de vedere al securitatii, deoarece accesul la date si la logica sensibila este controlat prin interfete bine definite. Astfel, componentele care gestioneaza informatii critice sunt izolate si protejate, iar interactiunea cu acestea este limitata si verificata.
Pentru implementarea sistemului este propus un stack tehnic format dintr-un frontend web realizat in React si TypeScript, un client desktop impachetat cu Electron sau Tauri si un backend bazat pe NestJS, care expune API-uri REST. Pentru persistenta datelor este utilizata o baza de date relationala, precum PostgreSQL, iar pentru gestionarea sesiunilor si a datelor temporare se foloseste Redis. In plus, sistemul include o componenta de mesagerie pentru notificari interne si integrare cu servicii externe prin SMTP sau API-uri dedicate.
Alegerea acestor tehnologii este motivata de maturitatea ecosistemului, suportul bun pentru securitate si tranzactii si disponibilitatea documentatiei. Acestea sunt larg utilizate in aplicatii reale, ceea ce reduce riscurile de implementare si faciliteaza dezvoltarea. In acelasi timp, permit construirea unei aplicatii stabile si apropiate de cerintele din domeniul bancar, unde corectitudinea si siguranta sunt esentiale.
Utilizarea unei baze de date relationale, impreuna cu un backend robust, este importanta pentru gestionarea corecta a operatiilor critice, cum sunt autentificarea, transferurile si actualizarea soldurilor. Redis si mecanismele de mesagerie contribuie la imbunatatirea performantelor si la gestionarea unor operatii asincrone, precum trimiterea notificarilor.
Din punct de vedere functional, sistemul este impartit in mai multe zone principale: canalul client, modulul de autentificare si identitate, gestionarea conturilor si a clientilor, procesarea tranzactiilor si a ledger-ului, administrarea cardurilor, generarea extraselor si a rapoartelor, componenta de risc si antifrauda, sistemul de notificari, modulul de administrare si audit, precum si integrarea cu sisteme externe.
Aceasta impartire reflecta principalele responsabilitati ale aplicatiei si permite organizarea clara a functionalitatilor. Fiecare subsistem poate fi proiectat si implementat separat, mentinand in acelasi timp integrarea intr-o arhitectura unitara. O astfel de organizare reduce dependintele inutile dintre componente si faciliteaza intelegerea fluxurilor principale ale sistemului.
In plus, delimitarea functionala sprijina atat dezvoltarea initiala, cat si extinderea ulterioara a platformei. Pot fi adaugate noi functionalitati sau integrari fara a afecta structura existenta, ceea ce contribuie la mentinerea unei arhitecturi coerente, scalabile si usor de administrat pe termen lung.





3.1.1 Subsisteme si responsabilitati principale
Subsistem
Responsabilitati
Tehnologii propuse
Canal client
Interfata web/desktop pentru login, dashboard, transferuri, carduri, extrase, notificari si sesiuni active.
React, TypeScript, Electron/Tauri
API Gateway / BFF
Expune endpoint-uri catre client, valideaza token-urile, aplica rate limiting, agrega raspunsuri si directioneaza cererile spre modulele interne.
NestJS, REST, JWT
Identity & Access
Inregistrare, login, reset parola, MFA, step-up auth, sesiuni active, dispozitive de incredere si politici de acces.
OTP, Redis
Customer & Accounts
Gestioneaza profilul clientului, conturile, IBAN-urile, soldurile curente si vizualizarea istoricului.
NestJS, PostgreSQL
Payments & Ledger
Proceseaza transferuri si plati, genereaza inregistrari debit/credit, aplica idempotency si controlul concurentei.
NestJS, PostgreSQL, transactions
Cards
Vizualizare carduri, blocare temporara, reactivare si reguli de utilizare disponibile pentru client.
NestJS, PostgreSQL
Statements
Genereaza extrase de cont pentru interval selectat, export si istoric documente generate.
PDF generator, storage
Risk & Fraud
Calculeaza scor de risc pe baza regulilor si poate cere verificare suplimentara sau poate bloca tranzactia.
Rules engine, event hooks
Notifications
Trimite email si notificari pentru login, transferuri, schimbari card si alerte de securitate.
SMTP/API, queue
Admin & Audit
Interfata si servicii pentru monitorizare, loguri, alerta, cautare in audit si suport operational.
Admin UI, audit tables, metrics


3.2 Decompozitia in subsisteme si responsabilitatile fiecarui subsistem
Pentru acest proiect a fost aleasa diagrama de clase, deoarece aceasta descrie intr-un mod clar modelul logic al domeniului si relatiile dintre entitatile principale ale sistemului. Diagrama urmareste legaturile dintre utilizatori, conturi, carduri, tranzactii, inregistrari de tip ledger, sesiuni, notificari si evenimente de audit, evidentiind modul in care aceste componente interactioneaza pentru a sustine functionalitatile aplicatiei.
Prin aceste relatii este conturata structura de baza a sistemului, fiind ilustrat modul in care datele sunt organizate si cum sunt corelate intre ele. Modelul pune accent atat pe zona operationala, prin clase precum Account, Transaction, LedgerEntry si Card, care sustin operatiile financiare, cat si pe zona de securitate si control, prin clase precum User, Session, Device, FraudCheck si AuditEvent. In acest fel, diagrama de clase nu se limiteaza la descrierea datelor, ci reflecta si dependintele logice dintre componentele esentiale ale sistemului.
Clasele centrale identificate sunt: User, Role, Session, Device, CustomerProfile, Account, Card, Beneficiary, TransferRequest, Transaction, LedgerEntry, Statement, Notification, FraudCheck, AuditEvent si IdempotencyKey. Intre aceste clase exista relatii de asociere si compunere care corespund cerintelor functionale definite. De exemplu, relatia dintre Transaction si LedgerEntry evidentiaza faptul ca fiecare tranzactie trebuie sustinuta de inregistrari contabile, iar legatura dintre TransferRequest si IdempotencyKey reflecta necesitatea prevenirii executarii duplicate a operatiilor. In mod similar, relatiile dintre User, Session si Device sustin mecanismele de autentificare si gestionare a sesiunilor active.
Clasele Notification, FraudCheck si AuditEvent completeaza modelul prin acoperirea functionalitatilor legate de notificari, detectia fraudelor si trasabilitatea operatiilor. Astfel, modelul de clase surprinde atat cerintele functionale, cat si cele nefunctionale ale sistemului, oferind o imagine coerenta asupra modului de organizare a aplicatiei.
Pentru o organizare mai clara a implementarii, structura este impartita pe pachete functionale precum: auth, customer, accounts, payments, cards, statements, notifications, risk, admin si shared. Fiecare pachet include componente specifice, cum ar fi modelele de date, logica de business, validarea datelor si interactiunea cu baza de date. Aceasta impartire este aliniata cu structura arhitecturala generala a sistemului, in care modulele principale corespund acestor zone functionale.
Separarea pe pachete contribuie la o mai buna organizare a codului si reduce dependintele intre diferitele parti ale aplicatiei. In acelasi timp, faciliteaza dezvoltarea etapizata a sistemului si distribuirea clara a responsabilitatilor. Prin aceasta abordare, structura logica a aplicatiei ramane coerenta si usor de inteles, iar modificarile pot fi realizate mai usor, fara a afecta alte componente.
Diagrama de clase poate fi actualizata pe masura ce detaliile implementarii devin mai clare, reflectand eventualele modificari ale modelului de date sau ale relatiilor dintre componente. Aceasta contribuie la mentinerea unei documentatii coerente si sincronizate cu structura reala a aplicatiei. In acest mod, decompozitia in subsisteme nu ramane doar la nivel teoretic, ci este sustinuta de un model logic clar, care descrie modul de functionare al sistemului.














3.3 Distributia subsistemelor pe platforme hardware/software
Din punct de vedere al distributiei pe platforme hardware si software, sistemul este organizat in mai multe zone logice, fiecare corespunzand unui nivel distinct al aplicatiei. Aceasta impartire permite separarea clara intre componentele care interactioneaza cu utilizatorul, cele care proceseaza logica de business si cele care gestioneaza datele si integrarile externe. O astfel de organizare contribuie la o mai buna intelegere a sistemului, la cresterea securitatii si la o administrare mai eficienta a resurselor.
Prima zona este reprezentata de nivelul client, care include browserul web si aplicatia desktop. Aceasta componenta ruleaza pe dispozitivul utilizatorului si are rolul de a afisa interfata aplicatiei si de a permite interactiunea cu sistemul. Toate cererile generate de utilizator sunt transmise catre backend prin intermediul unor conexiuni securizate. In aceasta zona nu exista acces direct la date sau la logica interna, ceea ce reduce riscul expunerii informatiilor sensibile.
Accesul la aplicatie este realizat printr-un punct unic de intrare, reprezentat de un reverse proxy sau load balancer. Acesta are rolul de a primi toate cererile venite de la client, de a gestiona conexiunile securizate si de a directiona traficul catre componentele interne ale sistemului. In acest punct pot fi aplicate politici de securitate, filtrare si control al accesului, precum validarea conexiunilor, limitarea numarului de cereri sau verificarea token-urilor. Utilizarea unui astfel de nivel intermediar permite centralizarea controlului asupra accesului si simplifica gestionarea infrastructurii.
Urmatoarea zona este reprezentata de nivelul aplicatiei, unde ruleaza serviciile de business. Acestea sunt responsabile pentru implementarea functionalitatilor principale ale sistemului, cum ar fi autentificarea, gestionarea conturilor, procesarea tranzactiilor, administrarea cardurilor, notificarea utilizatorilor si monitorizarea activitatii. In varianta initiala, aceste componente pot rula impreuna in cadrul aceleiasi aplicatii, fiind organizate intern pe module. Totusi, arhitectura permite separarea ulterioara a acestor module in componente independente, care pot rula pe instante diferite, in functie de necesitatile de scalare sau securitate.
Separarea subsistemelor la nivel de rulare permite o mai buna izolare a componentelor critice. De exemplu, modulul de autentificare sau cel de procesare a tranzactiilor poate fi gestionat separat fata de alte componente, avand reguli mai stricte de acces si utilizare a resurselor. In acelasi timp, aceasta abordare permite scalarea independenta a unor zone ale sistemului care sunt mai intens utilizate.
Nivelul de persistenta a datelor este reprezentat de infrastructura care gestioneaza stocarea informatiilor. Baza de date principala, de tip relational, este utilizata pentru pastrarea datelor critice precum utilizatori, conturi, tranzactii, carduri si evenimente de audit. Accesul la aceasta este realizat exclusiv prin intermediul serviciilor de business, asigurand astfel controlul asupra modului in care datele sunt citite si modificate.
Pe langa baza de date principala, sunt utilizate si componente auxiliare pentru date temporare. De exemplu, Redis este folosit pentru gestionarea sesiunilor active, a codurilor de autentificare MFA, a limitarilor de acces si a unor informatii cu durata scurta de viata. Aceasta separare intre datele persistente si cele temporare contribuie la cresterea performantelor si la o utilizare mai eficienta a resurselor.
Sistemul include si o zona de integrare cu servicii externe, necesare pentru completarea functionalitatilor aplicatiei. De exemplu, trimiterea de notificari se realizeaza prin intermediul unui server SMTP sau al unui serviciu extern dedicat. Aceste integrari sunt realizate prin interfete controlate, astfel incat eventualele erori sau intarzieri sa nu afecteze functionarea componentelor principale ale sistemului.
Pentru asigurarea functionarii corecte si monitorizarea aplicatiei, este inclus si un nivel de observabilitate, care utilizeaza loguri, metrici si sisteme de alerta. Acestea permit urmarirea comportamentului sistemului, identificarea rapida a problemelor si analizarea evenimentelor importante.
Din punct de vedere hardware, aceste zone pot fi distribuite pe instante sau servere diferite. Chiar daca in varianta initiala mai multe componente pot rula pe aceeasi infrastructura, arhitectura este definita astfel incat sa permita separarea ulterioara a acestora. De exemplu, serverul aplicatiei, baza de date si componentele auxiliare pot fi mutate pe noduri separate pentru a imbunatati performanta si securitatea.
Comunicarea intre aceste componente se realizeaza prin interfete bine definite si protocoale securizate. Clientul comunica cu sistemul prin HTTPS, iar accesul la resursele interne este controlat astfel incat sa fie permise doar interactiunile necesare. Aceasta distributie asigura o separare clara a responsabilitatilor si contribuie la construirea unei arhitecturi coerente, sigure si usor de extins.








3.4 Managementul datelor persistente
Sistemul utilizeaza o baza de date relationala, deoarece domeniul bancar impune cerinte stricte legate de consistenta datelor, definirea clara a relatiilor dintre entitati si suport pentru tranzactii de tip ACID. Modelul conceptual include entitati precum utilizatori, roluri, sesiuni, clienti, conturi, carduri, beneficiari, tranzactii, inregistrari de tip ledger, chei de idempotenta, notificari, scoruri de risc si evenimente de audit.
Alegerea unui model relational este justificata de natura structurata a datelor si de necesitatea mentinerii integritatii acestora pe parcursul operatiilor sensibile. Prin definirea relatiilor dintre entitati si utilizarea constrangerilor specifice (chei primare, chei externe, reguli de validare), se reduce riscul aparitiei inconsistentei datelor. In plus, suportul pentru tranzactii permite tratarea mai multor operatii dependente ca o singura unitate logica, ceea ce este esential in contextul operatiilor financiare.
Contul reprezinta unitatea financiara principala a sistemului si este asociat unui client. Tranzactiile nu modifica direct doar soldul, ci genereaza una sau mai multe inregistrari in ledger, astfel incat orice debit sa aiba un credit corespondent. Aceasta abordare permite o evidenta mai riguroasa si mai usor de verificat a operatiilor financiare. Soldul curent poate fi obtinut prin agregarea inregistrarilor din ledger sau poate fi mentinut intr-un camp separat, actualizat in cadrul tranzactiilor. In acest mod se asigura un echilibru intre corectitudinea modelului contabil si performanta necesara pentru interogari frecvente.
Pentru operatiile sensibile, cum sunt transferurile sau platile, sunt utilizate chei de idempotenta. Acestea sunt stocate impreuna cu informatii relevante despre cerere si cu rezultatul obtinut anterior. Astfel, in cazul retransmiterii unei cereri, sistemul poate identifica operatia si evita executarea duplicata. Acest mecanism este important pentru prevenirea erorilor cauzate de probleme de comunicare sau retry-uri automate, mai ales in contextul operatiilor financiare critice.
Extrasele de cont generate sunt salvate sub forma de fisiere, de exemplu PDF, intr-un sistem de stocare separat, in timp ce metadatele acestora sunt pastrate in baza de date. Aceasta separare permite gestionarea eficienta a volumului de date si mentinerea unei structuri clare a bazei principale.
Evenimentele de audit si informatiile legate de analiza riscului sunt stocate permanent, deoarece acestea sunt necesare pentru trasabilitate, monitorizare si investigarea incidentelor. Pastrarea acestor date permite reconstructia istoricului operatiilor si verificarea actiunilor realizate in sistem.
Prin aceasta organizare, managementul datelor persistente asigura atat functionarea corecta a operatiilor curente, cat si suportul pentru cerinte de securitate, control si analiza. Structura propusa permite o gestionare eficienta a datelor, reducand riscurile si asigurand o baza solida pentru dezvoltarea ulterioara a sistemului..
























3.5 Controlul accesului utilizatorilor la sistem
Modelul de acces propus combina mecanisme de autentificare, autorizare si politici operationale, astfel incat accesul la resursele sistemului sa fie controlat si securizat in mod corespunzator. Utilizatorul se autentifica prin username sau email si parola, iar pentru cresterea nivelului de securitate este utilizata autentificarea multi-factor (MFA). In cazul operatiilor cu risc ridicat, cum ar fi efectuarea transferurilor, platile peste un anumit prag sau modificarea setarilor importante, este aplicat mecanismul de step-up authentication, care introduce un nivel suplimentar de verificare.
Aceasta diferentiere intre accesul obisnuit si cel asociat operatiilor sensibile permite reducerea riscului de utilizare neautorizata a contului. In acelasi timp, asigura faptul ca actiunile critice sunt realizate doar dupa o confirmare suplimentara, ceea ce este esential in contextul unui sistem care gestioneaza date financiare.
Autorizarea utilizatorilor este realizata pe baza de roluri. Rolul de Client permite accesul exclusiv la resursele proprii, cum ar fi conturi, tranzactii, carduri, extrase, beneficiari si sesiuni active. Rolul de Administrator ofera acces la functionalitati suplimentare, precum monitorizarea sistemului, consultarea logurilor si gestionarea alertelor. In cazul extinderii aplicatiei, poate fi introdus si un rol de tip Auditor, cu acces limitat la informatii de audit, in mod exclusiv pentru analiza si verificare.
Aceasta separare a drepturilor este in acord cu principiul „least privilege”, conform caruia fiecare utilizator beneficiaza doar de accesul strict necesar. Definirea clara a rolurilor contribuie la controlul eficient al accesului si faciliteaza extinderea sistemului cu noi tipuri de utilizatori sau niveluri de acces.
Accesul la API este realizat pe baza de token-uri semnate, care sunt validate la fiecare cerere. Acest mecanism asigura faptul ca doar utilizatorii autentificati pot accesa resursele sistemului si permite controlul fin al accesului la endpoint-uri. In acelasi timp, sistemul permite utilizatorului vizualizarea sesiunilor active si ofera posibilitatea revocarii manuale a acestora, ceea ce adauga un nivel suplimentar de control si securitate.
Parolele sunt stocate exclusiv sub forma hash-uita, iar datele sensibile sunt afisate partial mascate, atat in interfata utilizatorului, cat si in loguri. Aceste masuri reduc riscul expunerii informatiilor critice si contribuie la protejarea datelor utilizatorilor.
La nivel operational, sunt aplicate mecanisme suplimentare de protectie, precum limitarea numarului de cereri (rate limiting), expirarea automata a sesiunilor, blocarea temporara a contului dupa incercari repetate de autentificare esuate si jurnalizarea evenimentelor importante. Aceste masuri au rolul de a preveni atacurile de tip brute force, abuzul asupra API-ului si utilizarea necorespunzatoare a conturilor.
Prin combinarea acestor mecanisme tehnice si operationale, controlul accesului este realizat intr-un mod coerent si sigur, fiind adaptat cerintelor unui sistem de online banking care gestioneaza informatii sensibile si operatii critice.


3.6 Fluxul global al controlului
Fluxul principal al sistemului incepe cu autentificarea utilizatorului. Dupa introducerea credentialelor si validarea acestora, precum si a factorului secundar atunci cand este necesar, utilizatorul obtine acces la interfata principala a aplicatiei, reprezentata de dashboard. In aceasta zona sunt disponibile informatii precum conturile, soldurile, istoricul tranzactiilor, cardurile si sesiunile active. Dashboard-ul reprezinta punctul central de interactiune si marcheaza trecerea de la zona de acces la zona operationala a sistemului.
Din acest punct, utilizatorul poate accesa diferitele functionalitati ale aplicatiei, in functie de rolul si drepturile asociate. Navigarea este organizata in jurul unor actiuni clare, initiate de utilizator si validate constant de sistem, astfel incat fiecare operatiune sa fie controlata si verificata inainte de executie.
Unul dintre cele mai importante fluxuri este cel de efectuare a unui transfer. Utilizatorul introduce datele tranzactiei, iar sistemul valideaza aceste informatii, verifica incadrarea in limitele definite si analizeaza existenta unor cereri similare prin mecanismul de idempotenta. Ulterior, tranzactia este transmisa catre modulul de analiza a riscului. In functie de rezultatul evaluarii si de regulile aplicabile, poate fi necesara o confirmare suplimentara prin step-up authentication.
Acest flux evidentiaza faptul ca executia unei operatii financiare este conditionata nu doar de datele introduse, ci si de reguli de securitate si control. Verificarea idempotentei previne executarea duplicata a operatiilor, iar analiza de risc contribuie la detectarea tranzactiilor suspecte. In acest mod, sistemul combina logica functionala cu mecanisme de protectie specifice unui domeniu sensibil.
Dupa aprobarea tranzactiei, motorul de procesare executa operatiile necesare intr-un mod atomic: sunt inregistrate datele tranzactiei, sunt generate inregistrarile corespunzatoare in ledger si sunt actualizate soldurile. In paralel, este generat un eveniment de audit si este declansat procesul de notificare a utilizatorului. Acesta primeste confirmarea operatiunii si, dupa caz, notificari suplimentare sau documente asociate, cum ar fi extrasele de cont.
Executia acestor pasi intr-o singura unitate logica este esentiala pentru mentinerea consistentei datelor si pentru corelarea informatiilor financiare cu mecanismele de trasabilitate. In acelasi timp, publicarea evenimentelor permite separarea fluxului principal de componentele auxiliare, precum notificarea sau generarea de documente, fara a afecta executia operatiei principale.
Pe langa fluxul utilizatorului final, exista si un flux separat pentru zona administrativa. Administratorul se autentifica in modulul dedicat si are acces la functii precum consultarea jurnalelor de audit, analiza tranzactiilor problematice si monitorizarea alertelor de risc. Aceste operatiuni sunt, la randul lor, inregistrate pentru a asigura trasabilitatea si controlul asupra actiunilor realizate.
Separarea fluxurilor intre utilizatorul final si administrator contribuie la delimitarea clara a responsabilitatilor si la protejarea functiilor sensibile. In ansamblu, fluxul global al controlului reflecta modul in care utilizatorii interactioneaza cu sistemul, precum si modul in care sunt integrate regulile de business, mecanismele de securitate si componentele de suport.
















3.7 Conditii limita si comportament in scenarii de eroare
Sistemul trebuie sa gestioneze corect situatiile exceptionale si scenariile de eroare, astfel incat sa mentina consistenta datelor, securitatea operatiilor si o experienta predictibila pentru utilizator. In continuare sunt prezentate principalele cazuri limita si modul in care acestea sunt tratate.
In cazul unei conexiuni slabe sau intrerupte, interfata trebuie sa afiseze clar starea operatiei si sa nu presupuna finalizarea unui transfer pana la primirea confirmarii explicite din partea sistemului. Daca cererea este retrimisa, mecanismul de idempotenta previne executarea dubla a aceleiasi operatii. Utilizatorul este informat prin mesaje clare ca operatia este in curs sau neconfirmata, evitandu-se astfel interpretari gresite sau actiuni repetate inutile.
In situatia unei latente ridicate, sistemul poate utiliza mecanisme de cache pentru operatiile de citire, in scopul reducerii timpilor de raspuns. In schimb, operatiile financiare raman strict consistente si sunt tratate cu prioritate. In cazul in care raspunsul intarzie, utilizatorul primeste informatii privind starea tranzactiei, fara a i se afisa rezultate incomplete. Aceasta abordare permite optimizarea performantelor fara a compromite corectitudinea datelor.
In cazul unei suprasolicitari a sistemului sau al unui numar mare de utilizatori activi, componentele fara stare pot fi replicate pentru a distribui incarcarea. Sistemul aplica limitarea numarului de cereri, foloseste mecanisme de coada pentru procesele auxiliare, precum notificarea, si prioritizeaza operatiile critice. Aceasta organizare permite mentinerea functionalitatii principale chiar si in conditii de incarcare ridicata.
Daca apare o defectiune la nivelul subsistemului de notificari, operatiile financiare nu sunt afectate, atata timp cat acestea au fost confirmate corect in sistem. Notificarile sunt retrimise ulterior, prin mecanisme asincrone. Separarea intre procesarea tranzactiilor si notificare permite evitarea blocarii fluxului principal din cauza unei componente secundare.
In cazul unei erori la nivelul bazei de date sau al persistentei, operatia nu este considerata finalizata. Utilizatorul primeste un mesaj neutru, fara detalii tehnice, iar evenimentul este inregistrat pentru analiza ulterioara. Aceasta abordare previne situatiile in care utilizatorul ar putea considera o operatie finalizata, desi datele nu au fost salvate corect.
In situatia detectarii unei activitati suspecte, sistemul poate solicita reautentificarea utilizatorului, poate bloca temporar operatia sau poate marca sesiunea pentru analiza ulterioara. Masurile aplicate depind de nivelul de risc identificat si permit limitarea potentialelor actiuni periculoase fara a afecta inutil intreaga activitate a utilizatorului. Prin tratarea acestor scenarii, sistemul isi mentine stabilitatea si securitatea chiar si in conditii neprevazute, oferind un comportament controlat si previzibil in fata erorilor sau a situatiilor exceptionale.


Glosar de termeni
API (Application Programming Interface) - interfata software prin care diferite componente ale aplicatiei sau sisteme externe comunica intre ele.
Audit log - jurnal al evenimentelor importante din sistem, utilizat pentru trasabilitate, monitorizare si investigarea incidentelor.
ACID - set de proprietati ale tranzactiilor in baza de date: atomicitate, consistenta, izolare si durabilitate.
BFF (Backend for Frontend) - strat intermediar care adapteaza raspunsurile backend-ului la nevoile interfetei client.
Cache - mecanism de stocare temporara a unor date accesate frecvent, utilizat pentru reducerea timpilor de raspuns.
Dashboard - interfata principala a aplicatiei, din care utilizatorul poate accesa functionalitatile disponibile.
Double-entry / Ledger - model de evidenta contabila in care fiecare tranzactie este inregistrata prin doua operatii corelate, debit si credit.
Fraud scoring - proces de evaluare a riscului unei tranzactii pe baza unor reguli sau criterii configurabile, pentru identificarea operatiunilor suspecte.
Hashing - proces de transformare a unei valori, de exemplu o parola, intr-o forma codificata ireversibila, utilizata pentru stocare sigura.
HTTPS - varianta securizata a protocolului HTTP, folosita pentru comunicatia protejata dintre client si server.
Idempotency - proprietate a unei operatii prin care executarea repetata a aceleiasi cereri produce acelasi rezultat, prevenind procesarea duplicata.
JWT (JSON Web Token) - token semnat utilizat pentru autentificarea si autorizarea cererilor catre API.
Least privilege - principiu de securitate conform caruia fiecare utilizator sau componenta primeste doar drepturile strict necesare pentru functionare.
Load balancer - componenta care distribuie traficul intre mai multe instante ale unei aplicatii, pentru imbunatatirea performantelor si disponibilitatii.
MFA (Multi-Factor Authentication) - metoda de autentificare care utilizeaza mai multi factori pentru verificarea identitatii utilizatorului.
OTP (One-Time Password) - cod de autentificare valabil o singura data sau pentru o perioada scurta de timp, utilizat in procesele MFA sau step-up authentication.
Rate limiting - mecanism de limitare a numarului de cereri acceptate intr-un anumit interval de timp, utilizat pentru protectie si stabilitate.
Redis - sistem de stocare in memorie folosit pentru date temporare, precum sesiuni active, coduri MFA sau chei de idempotenta.
REST - stil arhitectural utilizat pentru proiectarea API-urilor, bazat pe resurse si operatii standard HTTP.
Retry controlat - relansare limitata si sigura a unei operatii in caz de eroare temporara, fara afectarea consistentei sistemului.
Reverse proxy - componenta plasata in fata backend-ului, care primeste cererile externe si le directioneaza catre serviciile interne.
RBAC (Role-Based Access Control) - model de control al accesului in care drepturile utilizatorilor sunt stabilite pe baza rolurilor asociate acestora.
Scalabilitate - capacitatea sistemului de a gestiona un numar mai mare de utilizatori sau cereri fara degradare semnificativa a performantelor.
Session / sesiune activa - intervalul in care un utilizator autentificat interactioneaza cu sistemul, asociat unui dispozitiv sau unei autentificari valide.
SMTP (Simple Mail Transfer Protocol) - protocol utilizat pentru trimiterea mesajelor email.
Spring Boot - framework Java utilizat pentru dezvoltarea rapida a aplicatiilor backend si a serviciilor REST.
Stateless - caracteristica a unei componente care nu pastreaza stare intre cereri, ceea ce permite scalarea mai usoara.
Step-up authentication - verificare suplimentara ceruta pentru operatii sensibile, precum transferuri sau modificarea unor setari importante.
TLS (Transport Layer Security) - protocol utilizat pentru securizarea comunicatiei in retea.
Token - valoare generata de sistem si folosita pentru identificarea si validarea unei sesiuni sau a unei cereri.
Tracing / trasabilitate - posibilitatea de a urmari istoricul unei operatii sau al unui eveniment prin sistem, pe baza logurilor si a datelor de audit.
Transaction / tranzactie - operatie financiara efectuata in sistem, cum ar fi un transfer, o plata sau o actualizare de sold.
Observabilitate - capacitatea sistemului de a furniza informatii despre starea sa interna prin loguri, metrici si alerte.


 

