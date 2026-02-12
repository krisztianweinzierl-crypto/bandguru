/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AcceptInvite from './pages/AcceptInvite';
import Angebote from './pages/Angebote';
import ArtikelVerwaltung from './pages/ArtikelVerwaltung';
import Aufgaben from './pages/Aufgaben';
import Ausgaben from './pages/Ausgaben';
import BuchungsbedingungVorlagen from './pages/BuchungsbedingungVorlagen';
import EventDetail from './pages/EventDetail';
import Events from './pages/Events';
import Finanzen from './pages/Finanzen';
import Home from './pages/Home';
import Kalender from './pages/Kalender';
import Kunden from './pages/Kunden';
import KundenDetail from './pages/KundenDetail';
import Landing from './pages/Landing';
import LeadDetail from './pages/LeadDetail';
import Leads from './pages/Leads';
import MeineAufgaben from './pages/MeineAufgaben';
import MeineEvents from './pages/MeineEvents';
import Musiker from './pages/Musiker';
import MusikerDashboard from './pages/MusikerDashboard';
import MusikerDetail from './pages/MusikerDetail';
import MusikerProfil from './pages/MusikerProfil';
import Nachrichten from './pages/Nachrichten';
import Onboarding from './pages/Onboarding';
import OrganisationSettings from './pages/OrganisationSettings';
import Rechnungen from './pages/Rechnungen';
import Repertoire from './pages/Repertoire';
import Vertraege from './pages/Vertraege';
import VertragDetail from './pages/VertragDetail';
import VertragKundenansicht from './pages/VertragKundenansicht';
import Vertragsvorlagen from './pages/Vertragsvorlagen';
import acceptInvite from './pages/accept-invite';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcceptInvite": AcceptInvite,
    "Angebote": Angebote,
    "ArtikelVerwaltung": ArtikelVerwaltung,
    "Aufgaben": Aufgaben,
    "Ausgaben": Ausgaben,
    "BuchungsbedingungVorlagen": BuchungsbedingungVorlagen,
    "EventDetail": EventDetail,
    "Events": Events,
    "Finanzen": Finanzen,
    "Home": Home,
    "Kalender": Kalender,
    "Kunden": Kunden,
    "KundenDetail": KundenDetail,
    "Landing": Landing,
    "LeadDetail": LeadDetail,
    "Leads": Leads,
    "MeineAufgaben": MeineAufgaben,
    "MeineEvents": MeineEvents,
    "Musiker": Musiker,
    "MusikerDashboard": MusikerDashboard,
    "MusikerDetail": MusikerDetail,
    "MusikerProfil": MusikerProfil,
    "Nachrichten": Nachrichten,
    "Onboarding": Onboarding,
    "OrganisationSettings": OrganisationSettings,
    "Rechnungen": Rechnungen,
    "Repertoire": Repertoire,
    "Vertraege": Vertraege,
    "VertragDetail": VertragDetail,
    "VertragKundenansicht": VertragKundenansicht,
    "Vertragsvorlagen": Vertragsvorlagen,
    "accept-invite": acceptInvite,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};