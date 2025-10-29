import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Musiker from './pages/Musiker';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Events": Events,
    "Musiker": Musiker,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};