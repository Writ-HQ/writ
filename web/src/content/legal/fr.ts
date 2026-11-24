import type { LegalDoc, LegalSlug } from "./types";

// The legal pages in French. They must match en.ts section for section: the
// same pages, sections and block shapes in the same order, and the same
// {tokens} in the same blocks (checked by legal.test.ts).

export const fr: Record<LegalSlug, LegalDoc> = {
  privacy: {
    title: "Politique de confidentialité",
    description: "Comment Writ recueille, utilise, communique et protège les renseignements personnels.",
    intro: [
      "La présente politique explique comment {entity} (« Writ », « nous ») recueille, utilise, communique et protège les renseignements personnels lorsque vous visitez ce site Web, vous inscrivez à la liste d’attente ou communiquez avec nous.",
      "Nous traitons les renseignements personnels conformément à la Loi sur la protection des renseignements personnels et les documents électroniques (LPRPDE) du Canada et, lorsqu’elles s’appliquent à vous, aux lois provinciales sur la protection des renseignements personnels, comme la Loi sur la protection des renseignements personnels dans le secteur privé du Québec et les lois sur la protection des renseignements personnels de la Colombie-Britannique et de l’Alberta. Nos courriels respectent la Loi canadienne anti-pourriel (LCAP).",
    ],
    short: [
      "Aujourd’hui, nous recueillons seulement ce que vous inscrivez dans le formulaire de la liste d’attente ou ce que vous nous envoyez, ainsi que les journaux techniques dont tout site Web a besoin.",
      "Nous nous en servons pour vous informer au sujet de Writ et de son lancement. Nous ne vendons pas ces renseignements, ne les utilisons pas à des fins publicitaires et ne nous en servons pas pour entraîner des modèles d’intelligence artificielle.",
      "Vous pouvez demander en tout temps à consulter, à corriger ou à supprimer vos renseignements en écrivant à {privacyEmail}.",
      "Le produit Writ est conçu pour conserver les données des campagnes au Canada. Les lieux d’hébergement de ce site Web et de la liste d’attente sont indiqués à la page Sous-traitants.",
    ],
    sections: [
      {
        title: "Ce que nous recueillons",
        body: [
          {
            list: [
              "Lorsque vous vous inscrivez à la liste d’attente : votre nom, votre adresse courriel, votre organisation si vous l’indiquez, le type d’organisation, votre province ou territoire, la langue que vous avez utilisée, ainsi que le libellé exact du consentement que vous avez donné, avec la date et l’heure.",
              "Lorsque vous nous écrivez : votre message et les coordonnées que vous y incluez.",
              "Lorsque vous visitez ce site Web : l’entreprise qui l’héberge, {siteHost}, enregistre des renseignements techniques comme votre adresse IP, votre navigateur et les pages demandées, afin de vous fournir le site et d’en assurer la sécurité.",
            ],
          },
          "Nous n’utilisons aucun outil d’analyse, de publicité ou de suivi des médias sociaux sur ce site Web. La Politique relative aux témoins décrit le seul témoin (cookie) que nous utilisons.",
        ],
      },
      {
        title: "Comment nous les utilisons",
        body: [
          {
            list: [
              "Pour vous envoyer des nouvelles au sujet de la liste d’attente et du lancement de Writ, si vous y avez consenti.",
              "Pour vous répondre lorsque vous nous écrivez.",
              "Pour planifier le projet pilote, par exemple en voyant quels types d’organisations et quelles provinces s’y intéressent.",
              "Pour assurer la sécurité et le bon fonctionnement de ce site Web.",
              "Pour respecter nos obligations légales.",
            ],
          },
          "Nous n’utilisons pas vos renseignements à d’autres fins sans d’abord vous le demander, sauf si la loi l’exige ou le permet.",
        ],
      },
      {
        title: "Consentement et courriel",
        body: [
          "Nous vous envoyons des courriels seulement si vous avez coché la case de consentement du formulaire de la liste d’attente. Chaque courriel indique qui l’envoie et contient un lien de désabonnement. Vous pouvez retirer votre consentement en tout temps au moyen de ce lien ou en écrivant à {privacyEmail}; nous y donnons suite dans un délai de 10 jours ouvrables.",
        ],
      },
      {
        title: "Avec qui nous les communiquons",
        body: [
          "Nous communiquons des renseignements personnels uniquement aux entreprises qui exploitent ce site Web et conservent la liste d’attente pour nous, et seulement pour qu’elles puissent fournir ce service. Elles sont énumérées à la page Sous-traitants et sont tenues de protéger ces renseignements et de ne les utiliser à aucune autre fin.",
          "Nous pouvons communiquer des renseignements si la loi l’exige, par exemple en vertu d’une ordonnance d’un tribunal. Nous ne vendons jamais de renseignements personnels et ne les communiquons jamais à des partis politiques, à des campagnes ou à des annonceurs.",
        ],
      },
      {
        title: "Où ils sont conservés",
        body: [
          "La liste d’attente est conservée chez {waitlistHost}. Ce site Web est hébergé par {siteHost}. Si un fournisseur de services conserve ou traite des renseignements à l’extérieur du Canada, ceux-ci sont assujettis aux lois de ce pays, et les autorités de ce pays pourraient y avoir accès.",
          "Le produit Writ est conçu pour conserver les données des campagnes au Canada, dans la région Canada (Centre) d’Amazon Web Services.",
        ],
      },
      {
        title: "Durée de conservation",
        body: [
          "Nous conservons vos renseignements de la liste d’attente jusqu’à ce que vous nous demandiez de les supprimer, ou pendant 24 mois après le lancement de Writ si vous n’êtes pas devenu client, selon la première de ces éventualités. Les messages que vous nous envoyez sont conservés aussi longtemps que nous en avons besoin pour vous aider. Les journaux d’hébergement sont conservés pendant la période fixée par l’hébergeur.",
        ],
      },
      {
        title: "Comment nous les protégeons",
        body: [
          "Les renseignements circulent au moyen de connexions chiffrées (HTTPS). Seules les personnes de Writ qui en ont besoin peuvent les consulter, et l’accès à la base de données est restreint. Aucun système n’est parfaitement sûr; si une atteinte à la sécurité présente un risque réel de préjudice grave pour vous, nous vous en aviserons et la signalerons au Commissariat à la protection de la vie privée du Canada et, s’il y a lieu, à la Commission d’accès à l’information du Québec.",
        ],
      },
      {
        title: "Vos droits",
        body: [
          {
            list: [
              "Consulter les renseignements personnels que nous détenons à votre sujet.",
              "Les faire corriger s’ils sont inexacts.",
              "Retirer votre consentement et faire supprimer vos renseignements.",
              "Lorsque la loi du Québec s’applique, les recevoir dans un format technologique structuré et couramment utilisé.",
            ],
          },
          "Écrivez à {privacyEmail}. Nous répondons dans un délai de 30 jours. Si vous n’êtes pas satisfait, vous pouvez porter plainte auprès du Commissariat à la protection de la vie privée du Canada ou du commissaire à la protection de la vie privée de votre province.",
        ],
      },
      {
        title: "Enfants",
        body: ["Ce site Web et la liste d’attente ne s’adressent pas aux personnes de moins de 16 ans, et nous ne recueillons pas sciemment leurs renseignements."],
      },
      {
        title: "Lorsqu’une campagne utilise Writ",
        body: [
          "Lorsque le produit Writ sera lancé, des campagnes, des associations de circonscription, des bureaux et des groupes de défense d’intérêts l’utiliseront pour gérer leurs propres sympathisants et contacts. Ce sont eux qui décident des renseignements qu’ils recueillent et des raisons pour lesquelles ils le font; Writ les traite pour leur compte, conformément à l’Addenda sur le traitement des données. Si vous figurez sur l’une de leurs listes, veuillez d’abord communiquer avec eux; nous les aiderons à vous répondre.",
        ],
      },
      {
        title: "Modifications de la présente politique",
        body: ["Si nous modifions la présente politique, nous mettrons à jour la date en haut de cette page. Si une modification est importante, nous en informerons par courriel les personnes inscrites à la liste d’attente avant son entrée en vigueur."],
      },
      {
        title: "Nous joindre",
        body: ["Notre responsable de la protection des renseignements personnels est responsable de la présente politique. Écrivez à {privacyEmail} ou par la poste à {entity}, {address}."],
      },
    ],
  },

  terms: {
    title: "Conditions d’utilisation",
    description: "Les conditions d’utilisation du site Web de Writ et de l’inscription à la liste d’attente.",
    intro: [
      "Les présentes conditions s’appliquent lorsque vous utilisez ce site Web ou vous inscrivez à la liste d’attente de Writ. Elles constituent une entente entre vous et {entity} (« Writ », « nous »). Des conditions distinctes s’appliqueront à l’utilisation du produit Writ.",
      "En utilisant ce site Web, vous acceptez les présentes conditions. Si vous ne les acceptez pas, veuillez ne pas l’utiliser.",
    ],
    sections: [
      {
        title: "Utilisation de ce site Web",
        body: [
          "Vous pouvez utiliser ce site Web pour vous renseigner sur Writ et vous inscrire à la liste d’attente. Veuillez ne pas tenter d’en perturber le fonctionnement, d’accéder à des parties qui ne sont pas publiques ni d’en extraire des renseignements par des moyens automatisés. La Politique d’utilisation acceptable s’applique également à vous.",
        ],
      },
      {
        title: "La liste d’attente",
        body: [
          "L’inscription à la liste d’attente est gratuite. Elle ne garantit ni une place dans le projet pilote ni l’accès à Writ, et nous pouvons choisir qui inviter en premier. Vous pouvez quitter la liste d’attente en tout temps. Nous pouvons fermer la liste d’attente ou en modifier le fonctionnement.",
        ],
      },
      {
        title: "Ce que décrit ce site Web",
        body: [
          "Ce site Web décrit Writ tel qu’il est en cours de développement. Certaines fonctionnalités mentionnées sont prévues et ne sont pas encore offertes, et les plans peuvent changer. Les images du produit utilisent des noms et des chiffres fictifs. Rien sur ce site Web ne constitue une offre de fournir une fonctionnalité précise à une date précise.",
        ],
      },
      {
        title: "Propriété",
        body: [
          "Le site Web, ses textes, sa conception ainsi que le nom et le logo Writ nous appartiennent. Facebook et Instagram sont des marques de commerce de Meta Platforms, Inc. et X est une marque de commerce de X Corp.; Writ n’est ni affilié à ces entreprises ni approuvé par elles. Les autres noms appartiennent à leurs propriétaires respectifs.",
        ],
      },
      {
        title: "Aucune garantie",
        body: [
          "Le site Web est fourni tel quel. Nous nous efforçons de le maintenir exact et accessible, mais nous ne promettons pas qu’il le sera toujours.",
        ],
      },
      {
        title: "Limitation de notre responsabilité",
        body: [
          "Dans la mesure permise par la loi, nous ne sommes pas responsables des pertes indirectes ou consécutives découlant de votre utilisation de ce site Web. Rien dans les présentes conditions ne limite les droits auxquels vous ne pouvez renoncer en vertu des lois sur la protection du consommateur, y compris la Loi sur la protection du consommateur du Québec lorsqu’elle s’applique.",
        ],
      },
      {
        title: "Liens vers d’autres sites Web",
        body: ["Les liens vers d’autres sites Web sont fournis pour votre commodité. Nous ne sommes pas responsables de leur contenu ni de leurs pratiques en matière de protection des renseignements personnels."],
      },
      {
        title: "Droit applicable",
        body: [
          "Les présentes conditions sont régies par les lois de {province} et par les lois fédérales du Canada qui s’y appliquent. Si vous résidez au Québec, la loi du Québec s’applique également dans la mesure où elle doit s’appliquer.",
        ],
      },
      {
        title: "Modifications des présentes conditions",
        body: ["Nous pouvons mettre à jour les présentes conditions. Nous changerons alors la date en haut de cette page, et les nouvelles conditions s’appliqueront à partir de ce moment."],
      },
      {
        title: "Nous joindre",
        body: ["Questions sur les présentes conditions : {contactEmail}, ou par la poste à {entity}, {address}."],
      },
    ],
  },

  dpa: {
    title: "Addenda sur le traitement des données",
    description: "Comment Writ traite les renseignements personnels pour le compte des campagnes et des organisations qui l’utilisent.",
    intro: [
      "Le présent addenda fait partie de l’entente entre {entity} (« Writ ») et chaque client qui utilise le produit Writ (« vous »). Il s’applique lorsque Writ traite des renseignements personnels pour votre compte : vos sympathisants, vos contacts, vos bénévoles, vos commettants et les messages que vous échangez avec eux.",
      "Il entre en vigueur au lancement du produit Writ. D’ici là, Writ ne détient aucune donnée de client.",
    ],
    short: [
      "Vos données vous appartiennent. Writ les utilise uniquement pour vous fournir le service.",
      "Elles sont conservées au Canada et séparées des données de tous les autres clients.",
      "Nous ne les vendons jamais, ne les combinons jamais avec les données d’un autre client et ne les utilisons jamais pour entraîner des modèles d’intelligence artificielle.",
      "Nous vous informons rapidement de toute atteinte à la sécurité et supprimons vos données lorsque vous partez.",
    ],
    sections: [
      {
        title: "Rôles",
        body: [
          "Vous décidez des renseignements personnels à recueillir et des raisons de le faire, et il vous incombe de disposer d’un fondement juridique et de tout consentement nécessaire, y compris en vertu de la LCAP pour les messages que vous envoyez. Writ est votre fournisseur de services : il traite les renseignements uniquement selon vos instructions et pour fournir le service.",
        ],
      },
      {
        title: "Vos instructions",
        body: [
          "Writ traite vos données uniquement de la manière décrite dans votre entente et dans le présent addenda, et selon les directives que vous donnez au moyen du produit. Si nous estimons qu’une instruction contrevient à la loi, nous vous en aviserons.",
        ],
      },
      {
        title: "Séparation des autres clients",
        body: [
          "Les clients de Writ sont souvent des adversaires. Les données de chaque client sont conservées dans un espace qui lui est propre : la base de données garantit que les utilisateurs d’un client ne peuvent jamais consulter ni modifier les dossiers d’un autre. Nous ne combinons, ne comparons, ne communiquons ni ne vendons jamais de données d’un client à l’autre, et nous n’utilisons jamais les données sur les électeurs ou les sympathisants à nos propres fins.",
        ],
      },
      {
        title: "Sécurité",
        body: [
          {
            list: [
              "Les données sont conservées dans la région Canada (Centre) d’Amazon Web Services et sont chiffrées au repos et en transit.",
              "Chaque compte utilise la vérification en deux étapes.",
              "Les actions sensibles, comme les exportations, les importations, les changements de rôle, les suppressions et les envois, sont consignées dans un journal d’audit qui ne peut pas être modifié.",
              "Seuls les propriétaires et les administrateurs peuvent exporter des données.",
              "Le personnel de Writ n’y a accès que lorsqu’il en a besoin pour exploiter le service ou en assurer le soutien.",
            ],
          },
        ],
      },
      {
        title: "Confidentialité",
        body: ["Toutes les personnes chez Writ qui peuvent accéder à vos données sont tenues d’en préserver la confidentialité."],
      },
      {
        title: "Sous-traitants",
        body: [
          "Writ fait appel aux sous-traitants énumérés à la page Sous-traitants. Chacun est lié par des conditions écrites qui protègent vos données au moins aussi bien que le présent addenda. Nous vous donnerons un préavis de 30 jours avant d’en ajouter ou d’en remplacer un, et vous pourrez vous y opposer; si nous ne pouvons pas résoudre votre objection, vous pourrez mettre fin à l’entente.",
        ],
      },
      {
        title: "Lieu de conservation des données",
        body: ["Vos données sont conservées et traitées au Canada. Nous ne les transférerons pas à l’extérieur du Canada sans vous en informer à l’avance."],
      },
      {
        title: "Vous aider à respecter vos obligations",
        body: [
          "Nous vous aidons à répondre aux personnes qui demandent à consulter, à corriger ou à supprimer leurs renseignements, ainsi qu’aux autorités de protection des renseignements personnels. Le produit vous permet de consigner le consentement et les retraits de consentement de chaque personne, pour chaque canal.",
        ],
      },
      {
        title: "Atteintes à la sécurité",
        body: [
          "Si nous confirmons une atteinte à la sécurité touchant vos données, nous vous en aviserons sans délai indu et dans les 72 heures, en vous communiquant ce que nous savons, et nous vous aiderons à aviser les personnes concernées et les autorités de réglementation lorsque cela est requis.",
        ],
      },
      {
        title: "Fin du service",
        body: [
          "À la fin de votre entente, vous pouvez exporter vos données pendant 30 jours. Nous les supprimons ensuite dans un délai de 90 jours, y compris des copies de sauvegarde à mesure qu’elles expirent, sauf si la loi nous oblige à les conserver.",
        ],
      },
      {
        title: "Vérifications",
        body: ["Sur demande, nous vous fournissons les renseignements dont vous avez raisonnablement besoin pour confirmer que nous respectons le présent addenda."],
      },
      {
        title: "Nous joindre",
        body: ["Questions sur le présent addenda : {privacyEmail}."],
      },
    ],
  },

  "acceptable-use": {
    title: "Politique d’utilisation acceptable",
    description: "Ce à quoi Writ peut servir, et ce à quoi il ne doit pas servir.",
    intro: [
      "Writ sert à rassembler des personnes autour d’une cause, d’une campagne ou d’une communauté. La présente politique précise ce à quoi il ne doit pas servir. Elle s’applique à toute personne qui utilise Writ ou ce site Web, en plus des Conditions d’utilisation.",
    ],
    sections: [
      {
        title: "Respecter la loi",
        body: [
          "Utilisez Writ uniquement d’une manière conforme aux lois qui s’appliquent à vous, notamment les lois électorales comme la Loi électorale du Canada et les lois électorales provinciales, la Loi canadienne anti-pourriel, les lois sur la protection des renseignements personnels et les règles du CRTC sur les appels et les messages texte, y compris l’inscription au Registre de communication avec les électeurs lorsqu’elle s’applique.",
        ],
      },
      {
        title: "Communiquer avec les gens de façon appropriée",
        body: [
          {
            list: [
              "N’envoyez de messages qu’aux personnes qui ont accepté d’avoir de vos nouvelles ou que la loi vous permet de joindre.",
              "Donnez suite rapidement à chaque désabonnement et à chaque retrait de consentement.",
              "Ne téléversez pas de listes que vous avez achetées, obtenues par moissonnage ou que vous n’aviez pas le droit d’utiliser.",
            ],
          },
        ],
      },
      {
        title: "Être honnête",
        body: [
          {
            list: [
              "Ne vous faites pas passer pour un candidat, un représentant officiel, un organisme électoral ou toute autre personne.",
              "Ne diffusez pas de fausses informations sur la façon, le moment ou l’endroit où voter.",
              "Indiquez clairement lorsqu’une image, un enregistrement audio ou une vidéo a été généré ou modifié.",
            ],
          },
        ],
      },
      {
        title: "Respecter les gens",
        body: [
          "N’utilisez pas Writ pour harceler, menacer ou intimider qui que ce soit, pour fomenter la haine contre un groupe identifiable ou pour communiquer les renseignements personnels de quiconque sans en avoir le droit.",
        ],
      },
      {
        title: "Préserver la sécurité de Writ",
        body: [
          "Ne partagez pas de comptes, ne tentez pas de contourner la vérification en deux étapes ou les contrôles d’accès, ne sondez ni ne testez la sécurité de Writ sans notre autorisation écrite et ne tentez pas de consulter les données d’une autre organisation.",
        ],
      },
      {
        title: "Plateformes connectées",
        body: ["Lorsque vous connectez Facebook, Instagram ou d’autres services, leurs règles s’appliquent également."],
      },
      {
        title: "Nos mesures en cas d’usage abusif",
        body: [
          "Si nous croyons que Writ fait l’objet d’un usage abusif, nous pouvons retirer du contenu, interrompre les envois ou suspendre un compte. Nous vous en indiquerons la raison, sauf si la loi nous en empêche ou si cela mettrait des personnes en danger.",
        ],
      },
      {
        title: "Signaler un usage abusif",
        body: ["Écrivez à {contactEmail}. Nous examinons chaque signalement."],
      },
    ],
  },

  cookies: {
    title: "Politique relative aux témoins",
    description: "Le témoin qu’utilise ce site Web, et ce qu’il n’utilise pas.",
    intro: [
      "Ce site Web utilise un seul témoin (cookie), pour mémoriser la langue que vous avez choisie. Il n’utilise aucun témoin d’analyse, de publicité ou de médias sociaux, et il ne vous suit pas sur d’autres sites Web.",
    ],
    sections: [
      {
        title: "Le témoin que nous utilisons",
        body: [
          {
            table: {
              head: ["Nom", "Rôle", "Type", "Durée"],
              rows: [["NEXT_LOCALE", "Mémorise si vous lisez en anglais ou en français.", "Nécessaire au fonctionnement du site; installé par ce site Web", "Jusqu’à la fermeture de votre navigateur"]],
            },
          },
        ],
      },
      {
        title: "Stockage dans votre navigateur",
        body: [
          "Lorsque le produit Writ sera offert, il pourra enregistrer des préférences d’affichage, comme une barre latérale réduite, dans le stockage de votre navigateur. Elles restent sur votre appareil et ne nous sont jamais transmises.",
        ],
      },
      {
        title: "Ce que nous n’utilisons pas",
        body: ["Aucun outil d’analyse, aucune publicité ni reciblage, aucun pixel de médias sociaux et aucun suivi par des tiers."],
      },
      {
        title: "Gestion des témoins",
        body: [
          "Vous pouvez bloquer ou supprimer les témoins dans les paramètres de votre navigateur. Si vous bloquez le témoin de langue, le site Web fonctionne quand même; il pourrait simplement demander de nouveau votre langue à votre navigateur.",
        ],
      },
      {
        title: "Modifications et coordonnées",
        body: ["Si nous commençons à utiliser un autre témoin, nous l’indiquerons d’abord ici. Questions : {privacyEmail}."],
      },
    ],
  },

  subprocessors: {
    title: "Sous-traitants",
    description: "Les entreprises qui traitent des renseignements personnels pour le compte de Writ.",
    intro: [
      "Voici les entreprises qui conservent ou traitent des renseignements personnels pour Writ. Chacune ne peut les utiliser que pour nous fournir son service, conformément à des conditions écrites.",
    ],
    sections: [
      {
        title: "Ce site Web et la liste d’attente",
        body: [
          {
            table: {
              head: ["Entreprise et emplacement", "Ce qu’elle fait pour Writ"],
              rows: [
                ["{siteHost}", "Héberge ce site Web."],
                ["{waitlistHost}", "Conserve les inscriptions à la liste d’attente."],
              ],
            },
          },
        ],
      },
      {
        title: "Le produit Writ, dès son lancement",
        body: [
          {
            table: {
              head: ["Entreprise", "Ce qu’elle fait pour Writ", "Emplacement"],
              rows: [
                ["Amazon Web Services", "Hébergement, base de données, stockage de fichiers et envoi de courriels.", "Canada (Centre), Montréal"],
                ["Zitadel", "Connexion des équipes et vérification en deux étapes.", "Sera exploité au Canada avant le lancement"],
              ],
            },
          },
        ],
      },
      {
        title: "Ce qui n’est pas un sous-traitant",
        body: [
          "Facebook, Instagram et X ne sont pas des sous-traitants de Writ. Les campagnes y connectent leurs propres comptes, et les messages et publications transitent par ces plateformes selon leurs propres conditions.",
        ],
      },
      {
        title: "Modifications",
        body: ["Nous mettons à jour cette page avant qu’un nouveau sous-traitant commence ses activités, et nous donnons aux clients un préavis de 30 jours. Questions : {privacyEmail}."],
      },
    ],
  },
};
