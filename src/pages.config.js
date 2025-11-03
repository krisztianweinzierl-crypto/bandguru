import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Musiker from './pages/Musiker';
import Kunden from './pages/Kunden';
import EventDetail from './pages/EventDetail';
import OrganisationSettings from './pages/OrganisationSettings';
import Finanzen from './pages/Finanzen';
import Rechnungen from './pages/Rechnungen';
import Ausgaben from './pages/Ausgaben';
import MusikerDetail from './pages/MusikerDetail';
import KundenDetail from './pages/KundenDetail';
import Aufgaben from './pages/Aufgaben';
import Leads from './pages/Leads';
import LeadDetail from './pages/LeadDetail';
import Repertoire from './pages/Repertoire';
import Nachrichten from './pages/Nachrichten';
import Kalender from './pages/Kalender';
import Vertraege from './pages/Vertraege';
import VertragDetail from './pages/VertragDetail';
import Vertragsvorlagen from './pages/Vertragsvorlagen';
import VertragKundenansicht from './pages/VertragKundenansicht';
import AcceptInvite from './pages/AcceptInvite';
import MusikerDashboard from './pages/MusikerDashboard';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Events": Events,
    "Musiker": Musiker,
    "Kunden": Kunden,
    "EventDetail": EventDetail,
    "OrganisationSettings": OrganisationSettings,
    "Finanzen": Finanzen,
    "Rechnungen": Rechnungen,
    "Ausgaben": Ausgaben,
    "MusikerDetail": MusikerDetail,
    "KundenDetail": KundenDetail,
    "Aufgaben": Aufgaben,
    "Leads": Leads,
    "LeadDetail": LeadDetail,
    "Repertoire": Repertoire,
    "Nachrichten": Nachrichten,
    "Kalender": Kalender,
    "Vertraege": Vertraege,
    "VertragDetail": VertragDetail,
    "Vertragsvorlagen": Vertragsvorlagen,
    "VertragKundenansicht": VertragKundenansicht,
    "AcceptInvite": AcceptInvite,
    "MusikerDashboard": MusikerDashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};