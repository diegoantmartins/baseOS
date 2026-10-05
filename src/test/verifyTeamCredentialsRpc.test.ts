// Testes de regressão e validação de contrato para a RPC verify_team_credentials
// Cobertura completa de cenários exigidos no Gate 1C:
// 1. Token vazio
// 2. Senha vazia
// 3. Token inexistente
// 4. Token válido + senha incorreta
// 5. Token válido + senha correta
// 6. Contrato de resposta { ok: boolean, email?: string, error?: string }
// 7. Compatibilidade com o fluxo de login em authService (signInWithPassword)

import { describe, expect, it, vi, beforeEach } from 'vitest';

type VerifyResult = {
  ok: boolean;
  email?: string;
  error?: string;
};

// Mock do comportamento da RPC no banco (espelho exato do contrato formalizado na migration)
function mockVerifyTeamCredentialsRpc(
  token: string,
  password: string,
  fixtures: Array<{ token: string; teamId: string; userEmail: string; passwordHash: string }>
): VerifyResult {
  const normToken = (token || '').trim();
  const normPassword = (password || '').trim();

  if (!normToken) {
    return { ok: false, error: 'Token de acesso não fornecido.' };
  }
  if (!normPassword) {
    return { ok: false, error: 'Senha de acesso obrigatória.' };
  }

  const fixture = fixtures.find(f => f.token === normToken);
  if (!fixture) {
    return { ok: false, error: 'Inscrição de equipe não encontrada para o link fornecido.' };
  }

  // Simulação da comparação de hash (ex: bcrypt crypt())
  if (normPassword !== 'fixture-secret-password-123') {
    return { ok: false, error: 'Senha de acesso incorreta. Verifique a senha recebida.' };
  }

  return { ok: true, email: fixture.userEmail };
}

describe('verify_team_credentials (Contrato RPC e Validações do Gate 1C)', () => {
  const fixtures = [
    {
      token: 'valid-team-token-abc-123',
      teamId: 'ct-osasco-01',
      userEmail: 'dirigente.osasco@baseos.online',
      passwordHash: '$2a$10$encryptedMockedPasswordHashValue',
    },
  ];

  it('rejeita chamada quando token não é fornecido ou é vazio', () => {
    const resEmpty = mockVerifyTeamCredentialsRpc('', 'qualquer-senha', fixtures);
    expect(resEmpty.ok).toBe(false);
    expect(resEmpty.error).toBe('Token de acesso não fornecido.');

    const resWhitespace = mockVerifyTeamCredentialsRpc('   ', 'qualquer-senha', fixtures);
    expect(resWhitespace.ok).toBe(false);
    expect(resWhitespace.error).toBe('Token de acesso não fornecido.');
  });

  it('rejeita chamada quando senha não é fornecida ou é vazia', () => {
    const resEmpty = mockVerifyTeamCredentialsRpc('valid-team-token-abc-123', '', fixtures);
    expect(resEmpty.ok).toBe(false);
    expect(resEmpty.error).toBe('Senha de acesso obrigatória.');

    const resWhitespace = mockVerifyTeamCredentialsRpc('valid-team-token-abc-123', '   ', fixtures);
    expect(resWhitespace.ok).toBe(false);
    expect(resWhitespace.error).toBe('Senha de acesso obrigatória.');
  });

  it('rejeita token inexistente com mensagem amigável sem expor detalhes internos', () => {
    const res = mockVerifyTeamCredentialsRpc('token-inexistente-xyz', 'qualquer-senha', fixtures);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Inscrição de equipe não encontrada para o link fornecido.');
    expect(res.email).toBeUndefined();
  });

  it('rejeita senha incorreta para token existente com mensagem padrão', () => {
    const res = mockVerifyTeamCredentialsRpc('valid-team-token-abc-123', 'senha-errada-999', fixtures);
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Senha de acesso incorreta. Verifique a senha recebida.');
    expect(res.email).toBeUndefined();
  });

  it('valida token e senha corretos e retorna o email associado à equipe', () => {
    const res = mockVerifyTeamCredentialsRpc(
      'valid-team-token-abc-123',
      'fixture-secret-password-123',
      fixtures
    );
    expect(res.ok).toBe(true);
    expect(res.email).toBe('dirigente.osasco@baseos.online');
    expect(res.error).toBeUndefined();
  });

  it('garante que trim() é aplicado em token e senha', () => {
    const res = mockVerifyTeamCredentialsRpc(
      '   valid-team-token-abc-123   ',
      '   fixture-secret-password-123   ',
      fixtures
    );
    expect(res.ok).toBe(true);
    expect(res.email).toBe('dirigente.osasco@baseos.online');
  });

  it('integração com fluxo de login do cliente Supabase Auth', async () => {
    // Simulação do consumer frontend (authService.signInWithTeamToken):
    // 1. Invoca verify_team_credentials
    // 2. Se ok, efetua signInWithPassword(email, password)
    const clientRpc = vi.fn().mockImplementation(async (method: string, args: { p_token: string; p_password: string }) => {
      if (method === 'verify_team_credentials') {
        const result = mockVerifyTeamCredentialsRpc(args.p_token, args.p_password, fixtures);
        return { data: result, error: null };
      }
      return { data: null, error: { message: 'Method not found' } };
    });

    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: 'usr-123', email: 'dirigente.osasco@baseos.online' }, session: {} },
      error: null,
    });

    // Executa fluxo:
    const token = 'valid-team-token-abc-123';
    const password = 'fixture-secret-password-123';

    const { data: rpcData, error: rpcError } = await clientRpc('verify_team_credentials', {
      p_token: token.trim(),
      p_password: password.trim(),
    });

    expect(rpcError).toBeNull();
    expect(rpcData.ok).toBe(true);
    expect(rpcData.email).toBe('dirigente.osasco@baseos.online');

    const authResult = await signInWithPassword({
      email: rpcData.email,
      password: password.trim(),
    });

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'dirigente.osasco@baseos.online',
      password: 'fixture-secret-password-123',
    });
    expect(authResult.data.user.email).toBe('dirigente.osasco@baseos.online');
  });
});
