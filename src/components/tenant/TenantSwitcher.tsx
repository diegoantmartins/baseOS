/**
 * BaseOS — TenantSwitcher (Master Control)
 *
 * Componente do cabeçalho global visível exclusivamente para Platform Admins (is_platform_admin).
 * Permite alternar o tenant ativo em tempo real, propagando a troca para todas
 * as queries e views do sistema sem bloqueios de RLS.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  Check,
  Search,
  ShieldCheck,
  ExternalLink,
  Layers,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTenant } from '@/contexts/TenantContext';

export function TenantSwitcher() {
  const navigate = useNavigate();
  const {
    isPlatformAdmin,
    currentOrganization,
    currentOrganizationId,
    organizations,
    setOrganizationId,
    isLoading,
  } = useTenant();

  const [search, setSearch] = useState('');

  const filteredOrgs = useMemo(() => {
    if (!search.trim()) return organizations;
    const term = search.toLowerCase().trim();
    return organizations.filter(
      (org) =>
        org.name.toLowerCase().includes(term) ||
        (org.legalName && org.legalName.toLowerCase().includes(term)) ||
        (org.documentNumber && org.documentNumber.includes(term))
    );
  }, [organizations, search]);

  // Apenas renderiza se o usuário for Platform Admin
  if (!isPlatformAdmin) {
    return null;
  }

  const activeName = currentOrganization?.name || (isLoading ? 'Carregando bases...' : 'Selecionar Base');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 gap-2 bg-zinc-900/90 border-zinc-700/80 hover:bg-zinc-800 text-zinc-100 hover:text-white rounded-md shadow-sm transition-colors text-xs font-medium focus-visible:ring-1 focus-visible:ring-orange-500"
          aria-label={`Tenant ativo: ${activeName}. Clique para alternar.`}
          title="Tenant Switcher — Troca de contexto master"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            <Building2 className="w-3.5 h-3.5 text-orange-400" aria-hidden="true" />
          </div>

          <span className="truncate max-w-[120px] sm:max-w-[160px] text-zinc-200">
            {activeName}
          </span>

          <Badge
            variant="outline"
            className="hidden sm:inline-flex text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold border-orange-500/40 bg-orange-500/10 text-orange-400 rounded"
          >
            Master
          </Badge>

          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0 ml-0.5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-80 p-2 bg-zinc-950 border border-zinc-800 shadow-xl rounded-lg text-zinc-100"
      >
        <DropdownMenuLabel className="px-2 py-1.5 font-normal">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-orange-500" />
              <span className="font-semibold text-xs text-white">Troca de Contexto Multi-Tenant</span>
            </div>
            <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] px-1.5 py-0 font-mono">
              {organizations.length} {organizations.length === 1 ? 'base' : 'bases'}
            </Badge>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Selecione uma organização para navegar com o isolamento de dados do cliente.
          </p>
        </DropdownMenuLabel>

        <div className="px-1 py-1.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar organização..."
              className="h-8 pl-8 text-xs bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-orange-500 rounded-md"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <DropdownMenuSeparator className="bg-zinc-800 my-1" />

        <div className="max-h-60 overflow-y-auto space-y-0.5 py-0.5 pr-1">
          {filteredOrgs.length === 0 ? (
            <div className="py-4 text-center text-xs text-zinc-500">
              Nenhuma organização encontrada.
            </div>
          ) : (
            filteredOrgs.map((org) => {
              const isSelected = org.id === currentOrganizationId;
              return (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => setOrganizationId(org.id)}
                  className={`flex items-center justify-between px-2.5 py-2 text-xs rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-orange-500/15 text-orange-300 font-medium'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        isSelected
                          ? 'bg-orange-500 text-white'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700/60'
                      }`}
                    >
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="truncate font-semibold text-xs leading-tight text-zinc-100">
                        {org.name}
                      </p>
                      {org.legalName && (
                        <p className="truncate text-[10px] text-zinc-400 leading-tight">
                          {org.legalName}
                        </p>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-orange-400 shrink-0 ml-2" aria-hidden="true" />
                  )}
                </DropdownMenuItem>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator className="bg-zinc-800 my-1" />

        <DropdownMenuItem
          onClick={() => navigate('/master')}
          className="flex items-center justify-between text-xs text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded-md cursor-pointer font-medium px-2.5 py-1.5"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>Gerenciar Todas as Bases (/master)</span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-orange-500/70" />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
