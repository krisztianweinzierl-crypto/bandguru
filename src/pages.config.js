import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Musiker from './pages/Musiker';
import Kunden from './pages/Kunden';
import EventDetail from './pages/EventDetail';
import Onboarding from './pages/Onboarding';
import OrganisationSettings from './pages/OrganisationSettings';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Events": Events,
    "Musiker": Musiker,
    "Kunden": Kunden,
    "EventDetail": EventDetail,
    "Onboarding": Onboarding,
    "OrganisationSettings": OrganisationSettings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};