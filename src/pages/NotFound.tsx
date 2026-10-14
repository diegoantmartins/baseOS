import { useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();
  const cleanPath = location.pathname.replace(/^\//, '').trim();
  const isPotentialToken = /^[a-fA-F0-9]{16,}$/.test(cleanPath) || /^[a-zA-Z0-9_-]{32,}$/.test(cleanPath);

  useEffect(() => {
    if (!isPotentialToken) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname, isPotentialToken]);

  if (isPotentialToken) {
    return <Navigate to={`/equipe/inscricao/${cleanPath}`} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-5xl font-bold tracking-tight text-amber-500">404</h1>
        <p className="text-base text-zinc-400">Página ou recurso não encontrado no BaseOS.</p>
        <a
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition-colors border border-zinc-700"
        >
          Voltar ao Início
        </a>
      </div>
    </div>
  );
};

export default NotFound;
