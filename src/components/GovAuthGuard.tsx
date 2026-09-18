import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface GovAuthGuardProps {
  children: React.ReactNode;
}

/**
 * GovAuthGuard
 * Ensures only authenticated government officers (with valid `dss_auth_user` session)
 * can access AASRA Decision Support System command centers, GIS data, and tactical feeds.
 */
export default function GovAuthGuard({ children }: GovAuthGuardProps) {
  const location = useLocation();

  const isOfficerAuthenticated = () => {
    try {
      const savedUser = localStorage.getItem('dss_auth_user');
      if (!savedUser) return false;
      const parsed = JSON.parse(savedUser);
      return Boolean(parsed && (parsed.email || parsed.role || parsed.name));
    } catch {
      return false;
    }
  };

  if (!isOfficerAuthenticated()) {
    // Preserve requested path so the officer is redirected directly there post-login
    return <Navigate to="/gov/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
