import AcceptInvite from './pages/AcceptInvite';
import Angebote from './pages/Angebote';
import ArtikelVerwaltung from './pages/ArtikelVerwaltung';
import Aufgaben from './pages/Aufgaben';
import Ausgaben from './pages/Ausgaben';
import BuchungsbedingungVorlagen from './pages/BuchungsbedingungVorlagen';
import Dashboard from './pages/Dashboard';
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
import __Layout from './Layout.jsx';


export const PAGES = {
    "AcceptInvite": AcceptInvite,
    "Angebote": Angebote,
    "ArtikelVerwaltung": ArtikelVerwaltung,
    "Aufgaben": Aufgaben,
    "Ausgaben": Ausgaben,
    "BuchungsbedingungVorlagen": BuchungsbedingungVorlagen,
    "Dashboard": Dashboard,
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
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};