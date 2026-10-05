import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  Loader2,
  Lock,
  Volleyball,
  User,
  Users,
  Mail,
  Calendar,
  Hash,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useContext } from 'react';
import { AuthContext } from '@/components/auth/useAuth';
import { dataAccess } from '@/services/dataAccess';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabaseClient';
import type { TeamRecord, OrganizationRecord } from '@/types/entities';
import type { MembershipRole, UserMembership } from '@/types/identity';

export interface SmartAthleteFormProps {
  /** Organização corrente. Se omitido, descobre via sessão ou primeira disponível */
  organizationId?: string;
  /** Equipe alvo para vincular. Se omitido, exibe dropdown de equipes */
  teamId?: string;
  /** Papel padrão sugerido */
  defaultRole?: 'athlete' | 'team_manager' | 'coach';
  /** Callback executado após o sucesso do cadastro e vínculo multi-tenant */
  onSuccess?: (result: {
    profileId: string;
    membership: UserMembership;
    isExisting: boolean;
    name: string;
  }) => void;
  /** Callback para cancelamento */
  onCancel?: () => void;
  className?: string;
}

// Formatador visual de CPF: 000.000.000-00
function formatCpf(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function SmartAthleteForm({
  organizationId: propOrgId,
  teamId: propTeamId,
  defaultRole = 'athlete',
  onSuccess,
  onCancel,
  className = '',
}: SmartAthleteFormProps) {
  const auth = useContext(AuthContext);
  const session = auth?.session;

  // Estados dos campos
  const [cpf, setCpf] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'athlete' | 'team_manager' | 'coach'>(defaultRole);
  const [selectedTeamId, setSelectedTeamId] = useState(propTeamId || '');
  const [selectedOrgId, setSelectedOrgId] = useState(propOrgId || '');
  const [birthDate, setBirthDate] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [position, setPosition] = useState('');

  // Estados de controle e lookup
  const [isCheckingCpf, setIsCheckingCpf] = useState(false);
  const [isExistingIdentity, setIsExistingIdentity] = useState<boolean | null>(null);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Listas de apoio
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>([]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Carrega organizações e equipes disponíveis
  useEffect(() => {
    let isMounted = true;
    async function loadMetadata() {
      try {
        const [orgs, tList] = await Promise.all([
          dataAccess.listOrganizations(),
          dataAccess.listTeams(),
        ]);
        if (!isMounted) return;

        setOrganizations(orgs || []);
        setTeams(tList || []);

        if (!selectedOrgId) {
          const defaultOrg = orgs?.[0]?.id || 'org-1';
          setSelectedOrgId(defaultOrg);
        }

        if (!selectedTeamId && tList && tList.length > 0) {
          setSelectedTeamId(tList[0].id);
        }
      } catch (err) {
        console.error('[SmartAthleteForm] Erro ao carregar dados auxiliares:', err);
      }
    }
    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, [selectedOrgId, selectedTeamId]);

  // Função central de busca inteligente por CPF no BaseOS
  const checkCpfIdentity = useCallback(async (rawCpf: string) => {
    const cleanCpf = rawCpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setIsExistingIdentity(null);
      setExistingProfileId(null);
      return;
    }

    setIsCheckingCpf(true);
    setFeedbackError(null);

    try {
      // 1. Consulta segura via dataAccess (compatível com demo e supabase)
      const existingAthlete = await dataAccess.getAthleteByCpf(cleanCpf);

      if (existingAthlete) {
        setIsExistingIdentity(true);
        setExistingProfileId(existingAthlete.id);
        setName(existingAthlete.name);
        if (existingAthlete.birthDate) {
          setBirthDate(existingAthlete.birthDate);
        }
        return;
      }

      // 2. Consulta direta no Supabase (se configurado) na tabela profiles / athletes
      if (isSupabaseConfigured()) {
        const supabase = await getSupabaseClient();
        if (supabase) {
          // Busca em athletes por CPF normalizado
          const { data: ath } = await supabase
            .from('athletes')
            .select('id, name, birth_date')
            .eq('normalized_cpf', cleanCpf)
            .maybeSingle();

          if (ath) {
            setIsExistingIdentity(true);
            setExistingProfileId(ath.id);
            setName(ath.name);
            if (ath.birth_date) setBirthDate(ath.birth_date);
            return;
          }

          // Busca em profiles por id ou email
          const { data: prof } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', cleanCpf)
            .maybeSingle();

          if (prof) {
            setIsExistingIdentity(true);
            setExistingProfileId(prof.id);
            setName(prof.name);
            if (prof.email) setEmail(prof.email);
            return;
          }
        }
      }

      // Identidade não localizada: usuário novo
      setIsExistingIdentity(false);
      setExistingProfileId(null);
    } catch (err) {
      console.warn('[SmartAthleteForm] Aviso na checagem de CPF:', err);
      setIsExistingIdentity(false);
    } finally {
      setIsCheckingCpf(false);
    }
  }, []);

  // Manipulador de digitação do CPF com máscara e debounce automático
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);

    const clean = formatted.replace(/\D/g, '');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (clean.length === 11) {
      debounceTimerRef.current = setTimeout(() => {
        checkCpfIdentity(clean);
      }, 400);
    } else {
      setIsExistingIdentity(null);
      setExistingProfileId(null);
    }
  };

  // onBlur reforça a busca caso o debounce não tenha disparado
  const handleCpfBlur = () => {
    const clean = cpf.replace(/\D/g, '');
    if (clean.length === 11) {
      checkCpfIdentity(clean);
    }
  };

  // Submissão com Persistência Multi-Tenant Estrita
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackError(null);
    setFeedbackSuccess(null);

    const cleanCpf = cpf.replace(/\D/g, '');
    if (cleanCpf && cleanCpf.length !== 11) {
      setFeedbackError('O CPF informado deve conter 11 dígitos.');
      return;
    }

    if (!name.trim()) {
      setFeedbackError('O nome completo é obrigatório.');
      return;
    }

    const currentOrgId = selectedOrgId || propOrgId || 'org-1';
    const currentTeamId = selectedTeamId || propTeamId;

    if (!currentOrgId) {
      setFeedbackError('Selecione uma organização.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Gera ou reutiliza o profileId
      const profileId = existingProfileId || crypto.randomUUID();
      const syntheticEmail = email.trim() || `${cleanCpf || profileId.slice(0, 8)}@atleta.baseos.online`;

      // 2. UPSERT em public.profiles (sem tentar recriar em auth.users)
      if (isSupabaseConfigured()) {
        const supabase = await getSupabaseClient();
        if (supabase) {
          const profilePayload = {
            id: profileId,
            name: name.trim(),
            email: syntheticEmail,
            role: role === 'team_manager' ? ('team' as const) : ('viewer' as const),
            organization_id: currentOrgId,
            updated_at: new Date().toISOString(),
          };

          const { error: upsertErr } = await supabase
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });

          if (upsertErr) {
            console.warn('[SmartAthleteForm] profiles upsert aviso:', upsertErr);
          }
        }
      }

      // 3. Persistência da identidade canônica em athletes
      if (cleanCpf) {
        try {
          await dataAccess.createAthlete({
            id: profileId,
            name: name.trim(),
            normalizedCpf: cleanCpf,
            birthDate: birthDate || undefined,
          });
        } catch {
          // Já existe ou foi inserido concorrentemente
        }
      }

      // 4. INSERT em public.user_memberships vinculando profile_id à organization_id e team_id
      const membership = await dataAccess.createUserMembership({
        userId: profileId,
        organizationId: currentOrgId,
        teamId: currentTeamId || undefined,
        role: role as MembershipRole,
        status: 'active',
      });

      setFeedbackSuccess(
        isExistingIdentity
          ? `Identidade de ${name.trim()} vinculada com sucesso à equipe!`
          : `Atleta ${name.trim()} cadastrado e vinculado com sucesso!`
      );

      if (onSuccess) {
        onSuccess({
          profileId,
          membership,
          isExisting: !!isExistingIdentity,
          name: name.trim(),
        });
      }

      // Reset do formulário para o próximo atleta
      setCpf('');
      setName('');
      setEmail('');
      setBirthDate('');
      setJerseyNumber('');
      setPosition('');
      setIsExistingIdentity(null);
      setExistingProfileId(null);
    } catch (err: unknown) {
      console.error('[SmartAthleteForm] Erro na submissão:', err);
      const msg = err instanceof Error ? err.message : 'Falha ao salvar atleta e vínculo.';
      setFeedbackError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-zinc-950/90 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md text-zinc-100 ${className}`}
    >
      {/* Cabeçalho do Formulário */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Inscrição Inteligente de Atletas & Comissão
            </h2>
            <p className="text-xs text-zinc-400">
              Vínculo multi-tenant com reaproveitamento de identidade por CPF único
            </p>
          </div>
        </div>

        <Badge
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-zinc-300 text-[10px] uppercase tracking-wider"
        >
          BaseOS Identity v2
        </Badge>
      </div>

      {feedbackError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-950/60 border border-red-800/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{feedbackError}</span>
        </div>
      )}

      {feedbackSuccess && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Bloco 1: CPF Único com Debounce e Indicador de Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="athlete-cpf" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              CPF do Atleta / Integrante
            </Label>

            {isCheckingCpf && (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                Consultando BaseOS...
              </span>
            )}

            {!isCheckingCpf && isExistingIdentity === true && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 text-[11px] py-0.5 px-2 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Atleta já cadastrado no BaseOS
              </Badge>
            )}

            {!isCheckingCpf && isExistingIdentity === false && (
              <Badge variant="outline" className="border-zinc-700 text-zinc-400 flex items-center gap-1 text-[11px] py-0.5 px-2">
                <UserPlus className="w-3 h-3 text-zinc-400" />
                Novo atleta no BaseOS
              </Badge>
            )}
          </div>

          <div className="relative">
            <Input
              id="athlete-cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCpfChange}
              onBlur={handleCpfBlur}
              maxLength={14}
              className="bg-zinc-900/80 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500 font-mono text-sm h-11"
            />
            {isCheckingCpf && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
              </div>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            Digite o CPF para autocompletar e vincular a identidade existente sem duplicar registros.
          </p>
        </div>

        {/* Bloco 2: Nome Completo (Travado em Readonly quando atleta já existe) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="athlete-name" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-zinc-400" />
              Nome Completo
            </Label>
            {isExistingIdentity && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                <Lock className="w-2.5 h-2.5 text-amber-400" />
                Campo travado (Identidade verificada)
              </span>
            )}
          </div>

          <div className="relative">
            <Input
              id="athlete-name"
              type="text"
              placeholder="Nome completo do atleta ou comissão"
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={isExistingIdentity === true}
              className={`bg-zinc-900/80 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-11 text-sm ${
                isExistingIdentity ? 'bg-zinc-900/40 text-amber-200 cursor-not-allowed border-amber-500/20' : 'focus-visible:ring-amber-500'
              }`}
            />
            {isExistingIdentity && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Lock className="w-4 h-4 text-amber-400/70" />
              </div>
            )}
          </div>
        </div>

        {/* Bloco 3: Papel/Função e Equipe Alvo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Volleyball className="w-3.5 h-3.5 text-amber-400" />
              Função / Papel
            </Label>
            <Select
              value={role}
              onValueChange={(val) => setRole(val as 'athlete' | 'team_manager' | 'coach')}
            >
              <SelectTrigger className="bg-zinc-900/80 border-zinc-800 text-zinc-100 h-11 text-xs">
                <SelectValue placeholder="Selecione o papel" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                <SelectItem value="athlete">Atleta</SelectItem>
                <SelectItem value="team_manager">Dirigente / Representante</SelectItem>
                <SelectItem value="coach">Técnico / Treinador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              Equipe do Vínculo
            </Label>
            <Select
              value={selectedTeamId}
              onValueChange={setSelectedTeamId}
              disabled={!!propTeamId}
            >
              <SelectTrigger className="bg-zinc-900/80 border-zinc-800 text-zinc-100 h-11 text-xs">
                <SelectValue placeholder="Selecione a equipe" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.shortName})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bloco 4: Dados Específicos de Atleta (Posição, Camisa, Nascimento) */}
        {role === 'athlete' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 border-t border-zinc-800/40">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-zinc-400" />
                Número da Camisa
              </Label>
              <Input
                type="number"
                min={1}
                max={99}
                placeholder="Ex: 7 (opcional)"
                value={jerseyNumber}
                onChange={(e) => setJerseyNumber(e.target.value)}
                className="bg-zinc-900/80 border-zinc-800 text-zinc-100 h-10 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-200">
                Posição em Quadra
              </Label>
              <Select value={position} onValueChange={setPosition}>
                <SelectTrigger className="bg-zinc-900/80 border-zinc-800 text-zinc-100 h-10 text-xs">
                  <SelectValue placeholder="Selecione a posição" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs">
                  <SelectItem value="Levantador(a)">Levantador(a)</SelectItem>
                  <SelectItem value="Ponteiro(a)">Ponteiro(a)</SelectItem>
                  <SelectItem value="Oposto(a)">Oposto(a)</SelectItem>
                  <SelectItem value="Central">Central</SelectItem>
                  <SelectItem value="Líbero">Líbero</SelectItem>
                  <SelectItem value="Universal">Universal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Data de Nascimento
              </Label>
              <Input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="bg-zinc-900/80 border-zinc-800 text-zinc-100 h-10 text-xs"
              />
            </div>
          </div>
        )}

        {/* Bloco 5: E-mail (Opcional) */}
        <div className="space-y-2 pt-1 border-t border-zinc-800/40">
          <Label htmlFor="athlete-email" className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-zinc-400" />
            E-mail de Contato / Convite (Opcional)
          </Label>
          <Input
            id="athlete-email"
            type="email"
            placeholder="email@atleta.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900/80 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 h-10 text-xs"
          />
        </div>

        {/* Ações do Formulário */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-zinc-800 text-zinc-300 hover:bg-zinc-900 text-xs h-10 px-4"
            >
              Cancelar
            </Button>
          )}

          <Button
            type="submit"
            disabled={isSubmitting || isCheckingCpf || !name.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs h-10 px-5 shadow-lg shadow-amber-500/20"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando Vínculo...
              </span>
            ) : isExistingIdentity ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Vincular Atleta à Equipe
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                Cadastrar e Vincular
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SmartAthleteForm;
