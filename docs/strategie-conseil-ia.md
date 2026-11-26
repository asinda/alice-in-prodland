# Du blog SRE à la vitrine d'un cabinet de conseil en transformation IA

Document de travail. Les textes sont prêts à copier ; les `[crochets]` sont à compléter par vous. Rien ici n'affirme un projet client ou un résultat : tant que vous n'en avez pas de documentés, le site parle de méthode, de point de vue et de ce que vous proposez de faire.

---

## 0. Points à régler avant de publier

1. **Votre emploi actuel.** Vous êtes salariée (Cegedim). Avant d'afficher une activité de conseil, vérifiez votre contrat : exclusivité, non-concurrence, déclaration d'activité accessoire, propriété intellectuelle sur ce que vous produisez. C'est le point qui peut bloquer tout le reste.
2. **Le nom.** « CrashLoop » dit « panne en production » : c'est un bon nom de blog SRE, un mauvais nom de cabinet pour des dirigeants. Voir §1.
3. **Statut et mentions légales.** `lib/legal.ts` et la page Confidentialité devront décrire votre structure (entreprise individuelle, société), un formulaire de contact et une newsletter (RGPD : base légale, durée de conservation, désinscription).
4. **Aucune référence inventée.** Pas de logos, pas de chiffres, pas de « nous avons accompagné ». Pour la section Études de cas : voir §4.

---

## 1. Diagnostic de l'existant et identité

### Ce que le site est aujourd'hui

- Blog technique SRE/DevOps : 11 articles (Kubernetes, incidents, CI/CD, observabilité, un article sur l'architecture d'un SaaS IA, un sur Claude Code), plus des cours.
- Pages existantes : Accueil, Blog, Cours, À propos, Mentions légales, Confidentialité. Aucune page Services, Contact, Études de cas, Ressources ; aucune newsletter ni prise de rendez-vous.
- Public implicite : des ingénieurs. Un dirigeant qui arrive sur la page d'accueil voit un terminal et des post-mortems.
- Deux langues (FR/EN), SEO de base, bon socle technique : c'est réutilisable tel quel.

### Ce qu'il faut changer

| Problème | Conséquence | Correction |
|---|---|---|
| Aucune offre visible | Personne ne sait ce qu'on peut vous acheter | Page Services + appel à l'action sur toutes les pages |
| Ton « ingénieur à ingénieur » | Un décideur ne s'y reconnaît pas | Reformuler en problèmes business |
| Aucun moyen de vous contacter | Zéro prospect | Page Contact, diagnostic, rendez-vous |
| Marque = blog personnel | Pas de crédibilité de cabinet | Identité sobre, voix « nous » progressive |
| Contenu 100 % technique | Ne ressort pas sur « conseil IA » | Nouveau pilier éditorial IA en entreprise |

**Votre vrai atout** : vous venez de la production. La plupart des consultants IA parlent de stratégie sans avoir opéré un système en incident. Votre angle crédible est « l'IA qui tient en production » : fiabilité, sécurité, coûts, gouvernance. C'est cohérent avec votre contenu existant et c'est difficile à copier.

### Positionnement proposé

> **Faire passer l'IA du test à la production, dans des conditions que l'entreprise maîtrise.**

Phrase courte : « Conseil en transformation IA : de la stratégie à l'intégration, avec une exigence de fiabilité. »

### Nom : trois pistes

1. **Votre nom** (recommandé au départ) : « Alice Sindayigaya — Conseil en transformation IA ». Pas de risque de marque, crédible tout de suite, c'est vous qu'on engage.
2. **Un nom de cabinet neutre**, à vérifier (domaine, INPI, réseaux) avant tout usage. Pistes de pistes : un mot court, international, sans lien avec l'IA à la mode.
3. **Garder CrashLoop pour le blog technique** et le reléguer en sous-rubrique (« Journal d'ingénierie »), le temps de bâtir la marque cabinet.

Je recommande 1 maintenant, 2 quand vous aurez un premier client ou une structure juridique. Ne dépensez pas de budget de marque avant.

### Identité visuelle

- Sobre, institutionnelle, internationale : fond blanc cassé / bleu nuit profond, un seul accent (vert-bleu profond ou ocre), beaucoup d'air.
- Typographie : un serif sobre pour les titres (confiance), un sans-serif lisible pour le texte.
- Photos : vous, vrai portrait ; pas de banque d'images « robot et cerveau lumineux ».
- Abandonner : terminal sur l'accueil, vocabulaire d'incident dans les menus. Les garder dans la section technique.

---

## 2. Architecture du site

```
/                      Accueil
/services              Vue d'ensemble des 3 offres
  /services/audit-strategie-ia
  /services/integration-automatisation-ia
  /services/accompagnement-transformation-ia
/etudes-de-cas         Méthode d'abord, cas réels quand documentés
/blog                  Analyses et conseils (+ filtres par thème)
/ressources            Guides, modèles, livres blancs (échange contre e-mail)
/a-propos              Parcours, vision
/contact               Formulaire + rendez-vous + diagnostic
/newsletter            (ou bloc intégré)
/journal-ingenierie    Ancien contenu SRE/DevOps (blog technique conservé)
/mentions-legales, /confidentialite
```

Navigation principale (6 entrées max) : Services · Études de cas · Blog · Ressources · À propos · **[Demander un diagnostic IA]** (bouton).

Chaque URL existe en FR et EN (`/fr/...`, `/en/...`, déjà en place).

---

## 3. Textes des pages

### 3.1 Accueil

**Bandeau (titre)**
> L'IA qui tient en production.

**Sous-titre**
> J'accompagne les dirigeants et les équipes pour choisir les bons usages de l'intelligence artificielle, les intégrer dans les processus existants et les faire adopter, avec un cadre clair de sécurité et de gouvernance.

**Boutons** : `Demander un diagnostic IA` · `Voir les services`

**Bloc « Le constat »**
> Beaucoup d'entreprises ont lancé des essais d'IA. Peu les ont mis en production. Les raisons sont rarement techniques : cas d'usage mal choisis, données inaccessibles, équipes non préparées, risques mal cadrés. C'est ce qui se corrige avec une méthode.

**Bloc « Trois façons de travailler ensemble »** (3 cartes)
1. *Audit et stratégie IA* : savoir où l'IA vaut la peine, et dans quel ordre.
2. *Intégration et automatisation* : connecter l'IA à vos outils et automatiser les processus qui s'y prêtent.
3. *Accompagnement de la transformation* : préparer les équipes, former, gouverner.

**Bloc « Ma façon de travailler »** (4 points, sans chiffres inventés)
- Partir du processus métier, pas de la technologie.
- Mesurer avant d'automatiser : un indicateur de départ, un indicateur cible.
- Prévoir la sécurité, la conformité et la maintenance dès le début.
- Livrer par petites étapes vérifiables.

**Bloc « Pourquoi un regard d'exploitation »**
> Je viens de l'ingénierie de production (fiabilité, infrastructure, incidents). Je regarde un projet IA comme un système qui doit fonctionner un lundi matin, avec des coûts, des pannes possibles et des utilisateurs réels.

**Bloc « Dernières analyses »** : 3 articles du blog.

**Bloc final**
> **Un premier échange de 30 minutes, sans engagement.** Nous parlons de votre contexte, de vos priorités, et je vous dis honnêtement si et comment je peux vous aider.
> `Échanger sur votre projet IA`

**Newsletter** : « Une analyse par semaine sur l'IA en entreprise. Pas de jargon, pas de spam. » + champ e-mail.

### 3.2 À propos

> **Alice Sindayigaya**
> Je conseille les entreprises sur l'adoption de l'intelligence artificielle. J'ai construit mon expérience dans l'ingénierie de production : [années, rôle actuel, secteurs, à compléter avec ce qui est exact et publiable].
>
> **Mon parcours** : [3 à 5 lignes factuelles : formation, postes, certifications réelles (ex. CKA si valide), ce que vous opérez au quotidien].
>
> **Ma conviction.** L'IA apporte de la valeur quand elle est branchée sur un vrai processus, mesurée et gouvernée. Ce n'est ni une baguette magique ni un risque à éviter : c'est un outil à intégrer avec méthode.
>
> **Mon ambition.** Bâtir un cabinet indépendant, international, qui aide des organisations en Europe, en Afrique et au Moyen-Orient à adopter l'IA de façon responsable.
>
> **Ce que vous pouvez attendre de moi** : des recommandations claires, des limites énoncées, aucune promesse de résultat que je ne peux pas tenir.

### 3.3 Services (page d'ensemble)

> **Trois offres, un même fil : l'IA utile, sûre et adoptée.**
> Vous pouvez commencer par l'une ou enchaîner les trois.

(3 cartes avec lien vers chaque page, un schéma « Comprendre → Construire → Faire adopter ».)

#### A. Audit et stratégie IA

> **Pour qui.** Dirigeants et directions métiers qui veulent savoir où l'IA a du sens avant d'investir.
> **Le problème.** Trop d'idées, peu de priorités, pas de vision claire des données, des risques et des coûts.
>
> **Ce que je fais**
> - Diagnostic de maturité IA (organisation, données, outils, compétences, gouvernance).
> - Cartographie des processus et repérage des opportunités à fort impact.
> - Évaluation de la faisabilité, des risques et du coût de chaque cas d'usage.
> - Feuille de route priorisée sur 6 à 18 mois.
>
> **Ce que vous recevez** : un rapport de diagnostic, une liste de cas d'usage classés, une feuille de route, une restitution à la direction.
> **Format** : [à définir : durée, nombre d'ateliers]. Premier échange gratuit de 30 minutes.

#### B. Intégration et automatisation IA

> **Pour qui.** Équipes qui ont un cas d'usage identifié et veulent le mettre en service.
> **Le problème.** Les démonstrations fonctionnent, la mise en production non : outils isolés, API mal exploitées, aucune supervision.
>
> **Ce que je fais**
> - Intégration d'API et d'outils d'IA dans vos systèmes existants.
> - Automatisation de processus métiers (documents, support, qualification, reporting).
> - Conception d'assistants et d'agents IA avec des garde-fous.
> - Mise en place du suivi : qualité, coûts, journalisation, reprise sur erreur.
>
> **Ce que vous recevez** : un pilote fonctionnel, la documentation, le transfert de compétences, une évaluation des gains mesurés sur le pilote.
> **Approche** : pilote court d'abord, extension ensuite si les indicateurs le justifient.

#### C. Accompagnement à la transformation IA

> **Pour qui.** Dirigeants, DSI, RH et managers qui veulent une adoption durable.
> **Le problème.** Un outil non adopté ne produit rien ; une IA non gouvernée expose l'entreprise.
>
> **Ce que je fais**
> - Ateliers et sensibilisation pour dirigeants et équipes.
> - Formation pratique par métier.
> - Conduite du changement : sponsors, relais, communication, indicateurs d'adoption.
> - Gouvernance : charte d'usage, gestion des risques, confidentialité des données, conformité (dont le règlement européen sur l'IA, selon votre exposition).
>
> **Ce que vous recevez** : un plan d'adoption, une charte d'usage, des supports de formation, un comité de pilotage outillé.

### 3.4 Études de cas : sans fausse référence

Tant que vous n'avez pas de mission documentée, la page s'appelle **« Études de cas »** mais présente deux choses honnêtes :

1. **Démonstrations (« projets pilotes internes »).** Un vrai projet que vous avez construit (par exemple JobTaillor : génération de CV par IA, ou l'analyse d'architecture d'un SaaS IA déjà publiée). Étiquetés explicitement *« Projet personnel, pas une mission client »*, avec le problème, l'approche, les choix techniques, les limites.
2. **Modèle de cas à venir.** Un gabarit montrant comment vos futures études seront rédigées : contexte, problème, approche, résultat mesuré, enseignements. Chaque cas client futur n'est publié qu'avec l'accord écrit du client.

Texte d'introduction :
> Cette section grandira avec les missions. Pour l'instant, elle présente des projets pilotes que j'ai conçus moi-même, clairement identifiés comme tels, et la méthode que j'applique. Aucune référence client n'est affichée sans leur accord.

Règle à vous imposer : jamais de chiffre sans source et sans mesure réelle.

### 3.5 Ressources

Premiers contenus réalistes (à produire vous-même) :
- **Grille d'auto-diagnostic de maturité IA** (1 page, 20 questions).
- **Checklist « Avant de mettre un assistant IA en production »** (sécurité, données, coûts, supervision).
- **Modèle de charte d'usage de l'IA** pour une entreprise.
- **Guide « Choisir ses premiers cas d'usage IA »** (PDF court).

Mécanique : téléchargement contre e-mail + inscription newsletter (consentement explicite).

### 3.6 Contact

> **Parlons de votre projet IA.**
> Dites-moi où vous en êtes. Je réponds sous [2] jours ouvrés.
>
> Formulaire : nom, e-mail professionnel, entreprise, pays, secteur, taille, « Quel est votre besoin ? » (liste : Audit/stratégie ; Intégration/automatisation ; Accompagnement ; Je ne sais pas encore), message, case de consentement.
>
> **Ou réservez directement** un échange exploratoire de 30 minutes. `[lien de réservation]`
>
> **Diagnostic IA** : un premier échange structuré (questionnaire + 45 min) qui donne trois pistes priorisées. [Gratuit ou payant : à décider ; si gratuit, le limiter à une fois par entreprise.]

---

## 4. Stratégie éditoriale et calendrier sur 3 mois

Rythme proposé : **1 article de fond par semaine** (qualité d'abord ; votre planificateur sait déjà faire 3 publications/semaine, utilisez-le pour diffuser sur LinkedIn : article + extrait + question). Cible : dirigeants, DSI, responsables métiers. Chaque article : problème business, cadre de décision, exemple, liste de contrôle, appel à l'action.

Piliers : Stratégie et ROI · IA générative en entreprise · Automatisation et agents · Gouvernance, sécurité, conformité · Marchés (Europe, Afrique, Moyen-Orient).

### Mois 1 : poser les fondations (crédibilité et mots-clés centraux)

1. **IA en entreprise : pourquoi la plupart des pilotes n'atteignent pas la production** (stratégie)
2. **Diagnostic de maturité IA : les 6 questions à se poser avant d'investir** (audit) + ressource grille
3. **Comment choisir son premier cas d'usage d'IA (et lesquels éviter)** (stratégie)
4. **IA générative et données confidentielles : ce qu'on peut envoyer, ce qu'on doit garder** (sécurité)

### Mois 2 : aller vers l'action

5. **Automatiser un processus avec l'IA : de la cartographie au pilote en 6 étapes** (automatisation)
6. **Agent IA ou simple automatisation ? Un arbre de décision** (agents)
7. **Calculer le retour sur investissement d'un projet IA sans se raconter d'histoires** (ROI)
8. **Charte d'usage de l'IA : modèle et mode d'emploi** (gouvernance) + ressource modèle

### Mois 3 : élargir et convertir

9. **Règlement européen sur l'IA : ce que les dirigeants doivent savoir en pratique** (conformité ; à relire par un juriste)
10. **L'adoption, pas l'outil : comment préparer les équipes à l'IA** (changement)
11. **Cas d'usage de l'IA en Afrique : ce qui fonctionne vraiment (connexion, langues, paiement mobile)** (marchés ; sourcer chaque affirmation)
12. **IA en production : supervision, coûts et pannes, le regard d'un SRE** (votre angle distinctif)

Pour les trois mois : une newsletter hebdomadaire reprenant l'article + un conseil de 5 lignes, et une étude de cas « pilote » (votre projet) au mois 2.

Les articles SRE existants restent sous « Journal d'ingénierie » et servent de preuve de compétence.

---

## 5. Stratégie SEO

**Grappes de mots-clés**

| Intention | FR | EN |
|---|---|---|
| Cœur de marque | consultant transformation IA ; conseil en intelligence artificielle pour entreprises | AI transformation consulting ; AI strategy for businesses |
| Offre B | intégration IA en entreprise ; automatisation intelligente des processus | AI integration services ; intelligent process automation |
| Questions | comment intégrer l'IA dans son entreprise ; ROI d'un projet IA ; charte IA entreprise | how to integrate AI in business ; AI ROI ; AI governance policy |
| Local | conseil IA Afrique ; consultant IA Paris/Bruxelles/Dakar/Abidjan [selon votre base] | AI consulting Africa ; AI consultant Middle East |

**Règles**
- Une page = une intention : les pages Services visent les mots-clés « offre », les articles visent les questions.
- Titres de la forme *Problème + bénéfice* ; une seule `h1` ; descriptions de 150 caractères.
- Maillage : chaque article renvoie à un service pertinent et à une ressource.
- Données structurées : `Organization`, `ProfessionalService`, `Article`, `FAQPage` sur les pages Services.
- `hreflang` FR/EN sur chaque page traduite ; ne traduire que ce que vous traduisez bien (pas de traduction automatique brute).
- Anglais : commencer par Accueil, Services, Contact et 4 articles ; le reste suit.
- Mesurer : Search Console dès le premier jour, 5 requêtes suivies, une page de démarrage par grappe.
- Réalisme : un nouveau site met 6 à 12 mois à ressortir sur des requêtes concurrentielles. Le canal rapide au début est LinkedIn et le réseau ; le SEO est un investissement.

---

## 6. Attirer des clients : Europe, Afrique, Moyen-Orient

Principe commun : un client B2B en conseil achète d'abord de la confiance. Passez par des relations avant la publicité.

**Europe (France, Belgique, Suisse, puis plus loin)**
- Public : PME et ETI, DSI. Arguments : conformité (RGPD, règlement IA), souveraineté des données, ROI.
- Canaux : LinkedIn (articles + conversations), conférences et clubs d'entreprises, partenaires (experts-comptables, cabinets juridiques, intégrateurs).
- Langue : français d'abord.

**Afrique (francophone puis anglophone)**
- Public : banques, télécoms, administrations, PME en croissance, programmes de développement.
- Arguments : contraintes réelles (connectivité, coût du cloud, langues locales, paiement mobile) ; solutions sobres.
- Canaux : réseaux de la diaspora professionnelle, incubateurs, associations professionnelles, webinaires, LinkedIn.
- Précaution : ne pas affirmer de présence locale avant qu'elle existe ; privilégier les partenaires locaux.

**Moyen-Orient**
- Public : institutions et groupes (Golfe), cabinets de conseil qui cherchent un sous-traitant spécialisé.
- Particularités : relation personnelle longue, importance de l'anglais, parfois de l'arabe ; exigences de résidence des données.
- Canaux : partenariats avec des cabinets établis, événements, introductions. Prévoir plus de temps de développement.
- Précaution : vérifier réglementation locale et mentions requises avant de démarcher.

**Ordre conseillé** : Europe d'abord (marché que vous connaissez), Afrique en second par réseaux, Moyen-Orient par partenariats une fois un premier cas documenté.

---

## 7. Parcours de conversion

```
Article / LinkedIn  ──►  Ressource gratuite (e-mail)  ──►  Newsletter
                                     │
                                     ▼
              Page Services  ──►  « Demander un diagnostic IA »
                                     │
                                     ▼
                    Échange exploratoire 30 min (réservation)
                                     │
                                     ▼
                  Diagnostic / audit (offre A, payante)
                                     │
                                     ▼
                  Pilote d'intégration (B) → Accompagnement (C)
```

Détails :
- **Boutons** : « Demander un diagnostic IA » (en-tête, fin d'article, page Services), « Échanger sur votre projet IA » (accueil, articles).
- **Pied d'article** : encadré « Cet article vous parle ? Discutons de votre contexte. »
- **Suivi** : réponse sous 2 jours ouvrés, compte rendu écrit après l'échange, proposition courte avec périmètre clair.
- **Newsletter** : 4 e-mails de bienvenue (qui je suis, l'idée centrale, ressource, invitation à l'échange).
- **Mesure** : visiteurs → téléchargements → demandes → échanges → propositions. Quelques chiffres suffisent, notés chaque mois.

---

## 8. Plan d'évolution vers un cabinet international

| Phase | Durée | Objectif | Actions |
|---|---|---|---|
| 0 | maintenant | Cadre | Vérifier le contrat de travail ; choisir la structure ; décider du nom |
| 1 | mois 1-3 | Vitrine | Site refondu, 12 articles, 3 ressources, newsletter, 1 démonstration |
| 2 | mois 4-9 | Premières missions | Diagnostics, premier pilote, premier cas client (avec accord) |
| 3 | mois 10-18 | Répétabilité | Offres packagées, tarifs, modèles de livrables, 1 ou 2 partenaires |
| 4 | an 2+ | Équipe | Premier(e) associé(e) ou consultant(e), présence locale par partenaires, version anglaise complète |
| 5 | an 3+ | International | Entité ou bureau selon le marché, marque cabinet, publication d'études sectorielles |

Principe : n'étendez la marque qu'après des preuves ; chaque phase se finance par la précédente.

---

## 9. Ce que je peux construire dans le site, dans l'ordre

1. Pages **Services** (3 offres) et **Contact** (formulaire, rendez-vous), avec les textes ci-dessus FR/EN.
2. Nouvelle **page d'accueil** orientée dirigeants ; l'actuelle carte de métro passe sous « Journal d'ingénierie ».
3. **Études de cas** et **Ressources**, avec téléchargement contre e-mail.
4. **Newsletter** (stockage conforme RGPD, double opt-in).
5. Identité visuelle sobre sur tout le site, mentions légales adaptées.
6. SEO : données structurées, `hreflang`, plan du site.

Décisions qu'il me faut de vous : le nom retenu, le moyen de réservation (Calendly, Cal.com ou autre), où recevoir les messages du formulaire, et si le diagnostic est gratuit ou payant.
