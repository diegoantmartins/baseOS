# BASEOS — GERADOR E EXPORTADOR DE QR CODE OFICIAL

**Sistema:** BaseOS  
**Módulo:** Divulgação e Acesso Público  
**Componente:** `src/components/public/CompetitionQRCodeModal.tsx`  

---

## 1. Finalidade

Permitir que organizadores e federações divulguem instantaneamente o **Portal Público da Competição** através de:
1. Impressão de cartazes, banners e totens para ginásios e arenas esportivas.
2. Compartilhamento digital via redes sociais e aplicativos de mensagens.
3. Leitura rápida por smartphones de atletas, comissões técnicas e torcedores presentes no evento.

---

## 2. Requisitos Técnicos Atendidos

1. **Origem Dinâmica (Sem Hardcode):**
   A URL do QR Code é calculada a partir de `window.location.origin`:
   - Desenvolvimento: `http://localhost:5173/c/:slug`
   - Produção: `https://seu-dominio.com/c/:slug`

2. **Qualidade Gráfica e Quiet Zone:**
   - Utiliza a biblioteca `qrcode` com Error Correction Level **M** (na tela) e **H** (no download impresso).
   - Quiet zone (margem) de 4 módulos para leitura perfeita mesmo em ângulos difíceis ou sob iluminação irregular de ginásio.

3. **Exportação PNG em Alta Resolução (1024x1024 px):**
   - Atendendo ao requisito obrigatório de homologação, o botão *"Baixar PNG 1024px"* gera uma imagem rasterizada em resolução exata de 1024 por 1024 pixels, pronta para envio a gráficas.

4. **Integração com Web Share API:**
   - Em smartphones e navegadores compatíveis, o botão *"Compartilhar"* abre o menu nativo do sistema operacional (WhatsApp, Telegram, etc.).
   - Em desktops ou navegadores sem suporte, realiza a cópia direta da URL para a área de transferência com toast de confirmação.

---

## 3. Acesso no Sistema

O acesso ao modal de QR Code está disponível em:
1. **Cabeçalho Administrativo da Competição (`CompetitionHeader`):** Botão `[QR Code]` ao lado de `[Ver Portal]` e `[Copiar Link]`.
2. **Barra Superior do Portal Público (`PublicCompetitionPage`):** Botão `[QR Code]` acessível para qualquer visitante.
