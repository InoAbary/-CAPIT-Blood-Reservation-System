import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";

export default function ProtectedRoute() {
    const [status, setStatus] = useState("loading");

    useEffect(() => {
        fetch("http://localhost:3000/api/auth/me", {
            credentials: "include"
        })
        .then((res) => {
            setStatus(res.ok ? "authenticated" : "unauthenticated");
        })
        .catch(() => setStatus("unauthenticated"));
    }, []);

    if (status === "loading") {
        return <p>Checking session...</p>;
    }

    if (status === "unauthenticated") {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}
