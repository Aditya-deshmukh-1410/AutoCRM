import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Leads from "./pages/Leads";
import Vehicles from "./pages/Vehicles";
import TestDrives from "./pages/TestDrives";
import Sales from "./pages/Sales";
import Finance from "./pages/Finance";
import Activities from "./pages/Activities";
import Users from "./pages/Users";
import AuditHistory from "./pages/AuditHistory";
import Showroom from "./pages/Showroom";
import DealershipProfile from "./pages/DealershipProfile";
import DealershipSettings from "./pages/DealershipSettings";
import RequireAuth from "./components/RequireAuth";
import AppLayout from "./components/AppLayout";
import { RequireDealershipAdmin, RequireDealershipUser, RequirePlatformAdmin } from "./components/RequirePlatformAdmin";
import ControlPanel from "./pages/ControlPanel";
import WebsiteBuilder from "./pages/WebsiteBuilder";
import SiteLayout from "./pages/site/SiteLayout";
import SiteHome from "./pages/site/SiteHome";
import SiteStock from "./pages/site/SiteStock";
import SiteCarDetail from "./pages/site/SiteCarDetail";
import SiteAbout from "./pages/site/SiteAbout";
import SiteContact from "./pages/site/SiteContact";
import SiteSell from "./pages/site/SiteSell";
import BuilderPreview from "./pages/site/BuilderPreview";
import Notifications from "./pages/Notifications";
import SellRequests from "./pages/SellRequests";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/showroom" element={<Showroom />} />
        <Route path="/site/:slug" element={<SiteLayout />}>
          <Route index element={<SiteHome />} />
          <Route path="stock" element={<SiteStock />} />
          <Route path="stock/:carId" element={<SiteCarDetail />} />
          <Route path="sell-car" element={<SiteSell />} />
          <Route path="about" element={<SiteAbout />} />
          <Route path="contact" element={<SiteContact />} />
        </Route>
        <Route path="/builder-preview/*" element={<BuilderPreview />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/control-panel" element={<RequireAuth><RequirePlatformAdmin><ControlPanel /></RequirePlatformAdmin></RequireAuth>} />
        <Route element={<RequireAuth><RequireDealershipUser><AppLayout /></RequireDealershipUser></RequireAuth>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/sell-requests" element={<SellRequests />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:vehicleId" element={<Vehicles />} />
          <Route path="/test-drives" element={<TestDrives />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/users" element={<Users />} />
          <Route path="/audit-history" element={<AuditHistory />} />
          <Route path="/dealership-profile" element={<DealershipProfile />} />
          <Route path="/dealership-settings" element={<DealershipSettings />} />
          <Route path="/website" element={<RequireDealershipAdmin><WebsiteBuilder /></RequireDealershipAdmin>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
