# 🤖 Prompt para Claude/Copilot - Correções de Segurança em React/Next.js

Use este prompt sempre que encontrar erros de `undefined`, `null`, `toFixed`, `includes` ou similares no console.

---

## 📋 Prompt Completo

```markdown
@workspace /fix

Atue como um Engenheiro Sênior de Frontend especializado em React/Next.js e TypeScript.

DIAGNÓSTICO:
Estou vendo os seguintes erros no console F12:
[COLE AQUI OS ERROS DO CONSOLE]

CONTEXTO DO PROJETO:
- Framework: Next.js 14 (App Router)
- Database: Supabase (PostgreSQL)
- Stack: TypeScript + React + TailwindCSS
- Problema: Dados podem vir vazios/null das Views SQL, causando crashes no frontend

TAREFA:
Analise o workspace e corrija TODOS os pontos onde:

1. **Erro toFixed()**: Valores numéricos podem ser `undefined` ou `null`
   - ❌ ANTES: `value.toFixed(2)`
   - ✅ DEPOIS: `(value || 0).toFixed(2)`

2. **Erro includes()**: Strings/Arrays podem ser `undefined` ou `null`
   - ❌ ANTES: `array.filter(x => x.name.includes('term'))`
   - ✅ DEPOIS: `(array || []).filter(x => (x.name || '').includes('term'))`

3. **Acesso a propriedades aninhadas**: Objetos podem ser `null`
   - ❌ ANTES: `data.user.name`
   - ✅ DEPOIS: `data?.user?.name || 'N/A'`

4. **Operações matemáticas**: Divisões por zero ou undefined
   - ❌ ANTES: `(sold / total) * 100`
   - ✅ DEPOIS: `total > 0 ? (sold / total) * 100 : 0`

5. **Loading States**: Componentes devem validar se dados existem
   - ❌ ANTES: `if (loading) return <Loader />`
   - ✅ DEPOIS: `if (loading || !data) return <Loader />`

6. **Funções de Query**: Devem retornar objetos seguros, não lançar exceções
   - ❌ ANTES: `if (error) throw error`
   - ✅ DEPOIS: `if (error) return { data: defaultValue, error }`

ARQUIVOS PRIORITÁRIOS:
Verifique e corrija (se necessário):
- app/admin/analytics/page.tsx
- app/admin/dashboard/page.tsx
- app/admin/webhooks/page.tsx
- app/admin/reports/page.tsx
- app/admin/products/page.tsx
- lib/dashboard-queries.ts
- components/dashboard/*.tsx

REGRAS DE SEGURANÇA:
1. ✅ SEMPRE use Optional Chaining: `object?.property`
2. ✅ SEMPRE use Nullish Coalescing: `value || defaultValue`
3. ✅ SEMPRE valide arrays antes de iterar: `(array || []).map(...)`
4. ✅ SEMPRE valide objetos antes de renderizar: `if (!data) return null`
5. ✅ NUNCA deixe `toFixed()` sem proteção
6. ✅ NUNCA deixe `includes()` sem proteção
7. ✅ NUNCA assuma que dados do backend existem

RESULTADO ESPERADO:
Após suas correções:
- ✅ Console F12 sem erros de JavaScript
- ✅ Páginas renderizam mesmo com dados vazios
- ✅ KPIs mostram "0" ao invés de crashar
- ✅ Loading states funcionam corretamente
- ✅ Não há telas brancas (white screens)

FORMATO DA RESPOSTA:
1. Liste os arquivos que precisam ser corrigidos
2. Mostre cada correção (ANTES/DEPOIS)
3. Execute as modificações
4. Confirme que não há erros com `get_errors`
5. Gere um resumo das mudanças

Pode começar!
```

---

## 🎯 Exemplo de Uso

### Cenário: Página de Analytics dando tela branca

**Console F12:**
```
Uncaught TypeError: Cannot read properties of undefined (reading 'toFixed')
    at AnalyticsPage (page.tsx:160)
```

**O que fazer:**
1. Cole o prompt acima no chat do Cursor/Copilot
2. Cole o erro do console na seção `[COLE AQUI OS ERROS]`
3. Aguarde a IA analisar e corrigir
4. Teste a página novamente

---

## 📚 Variações do Prompt

### Para Corrigir Apenas Queries (Backend)
```markdown
@workspace /fix

Foco: lib/dashboard-queries.ts

Corrija todas as funções de query para:
- Nunca lançar exceções (throw error)
- Sempre retornar objetos/arrays seguros
- Incluir valores default quando error ocorrer

Exemplo:
❌ if (error) throw error
✅ if (error) return { data: [], error }
```

### Para Corrigir Apenas Componentes (Frontend)
```markdown
@workspace /fix

Foco: components/dashboard/*.tsx

Corrija todos os componentes para:
- Validar props antes de usar
- Usar optional chaining em todos os acessos
- Adicionar loading/error states
- Proteger toFixed(), includes(), map(), etc

Exemplo:
❌ <p>{data.revenue.toFixed(2)}</p>
✅ <p>{(data?.revenue || 0).toFixed(2)}</p>
```

### Para Análise Completa (Auditoria)
```markdown
@workspace /analyze

Faça uma auditoria completa do código buscando:
1. Todos os usos de .toFixed() sem proteção
2. Todos os usos de .includes() sem validação
3. Todos os acessos a propriedades sem optional chaining
4. Todos os loading states sem validação de dados
5. Todas as queries que lançam exceções

Liste os arquivos problemáticos e sugira correções.
```

---

## 🛠️ Comandos Úteis para Debug

### Procurar por padrões inseguros:
```bash
# Encontrar toFixed sem proteção
grep -r "\.toFixed" app/ --include="*.tsx" | grep -v "|| 0"

# Encontrar includes sem proteção
grep -r "\.includes" app/ --include="*.tsx" | grep -v "|| \[\]"

# Encontrar acessos diretos a propriedades
grep -r "\.\w\+\." app/ --include="*.tsx" | grep -v "?."
```

### Validar se a correção funcionou:
```typescript
// Adicione este hook de debug em qualquer componente:
useEffect(() => {
  console.log('🔍 Debug:', {
    data,
    loading,
    hasData: !!data,
    isArray: Array.isArray(data),
    keys: data ? Object.keys(data) : []
  })
}, [data, loading])
```

---

## 🎓 Checklist de Código Seguro

Antes de fazer deploy, verifique:

- [ ] Todos os `toFixed()` têm `|| 0` antes
- [ ] Todos os `includes()` têm `|| ''` ou `|| []` antes
- [ ] Todos os acessos a objetos usam `?.` (optional chaining)
- [ ] Todos os componentes validam `loading || !data`
- [ ] Todas as queries retornam objetos/arrays default
- [ ] Todas as divisões matemáticas verificam divisor > 0
- [ ] Todos os maps/filters validam se array existe
- [ ] Nenhum `throw error` em funções de query

---

**Última atualização**: 21/01/2026  
**Autor**: Sistema de Correção Automática  
**Versão**: 1.0
