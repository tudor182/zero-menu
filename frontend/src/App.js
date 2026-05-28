import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { I18nProvider } from "./lib/i18n";
import Home from "./pages/Home";
import LocationMenu from "./pages/LocationMenu";
import ProductDetail from "./pages/ProductDetail";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <div className="App">
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/produs/:id" element={<ProductDetail />} />
            <Route path="/:categorie" element={<LocationMenu />} />
            <Route path="/:categorie/:subcategorie" element={<LocationMenu />} />
            <Route path="/:categorie/:subcategorie/:tip" element={<LocationMenu />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </div>
  );
}
