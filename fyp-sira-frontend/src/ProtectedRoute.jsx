import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ requiredRole }) => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const isAdmin = localStorage.getItem("isAdmin");

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (requiredRole === 'admin' && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
