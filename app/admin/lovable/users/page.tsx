'use client'

// =====================================================
// PÁGINA: Usuários Lovable
// =====================================================
// Gerenciamento completo de usuários do sistema externo
// =====================================================

import { useEffect, useState } from 'react'
import {
  generateSecurePassword,
  type LovableUser,
} from '@/services/lovable-integration'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { 
  User, 
  UserPlus, 
  Key, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Copy,
  Mail,
  Calendar,
  Shield,
  Ban,
  Trash2,
  CheckCircle,
  Sparkles,
  RotateCw,
  Send
} from 'lucide-react'
import { getDisplayName } from '@/lib/display-helpers'

export default function LovableUsersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<LovableUser[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Modal de criar usuário
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    full_name: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)

  // Modal de resetar senha
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [selectedUser, setSelectedUser] = useState<LovableUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Modal de confirmar desativar
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  // Modal de confirmar excluir
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Estados para botões de pânico
  const [resyncing, setResyncing] = useState<string | null>(null) // email do cliente em resync
  const [resending, setResending] = useState<string | null>(null) // email do cliente em resend

  // =====================================================
  // CARREGAR USUÁRIOS
  // =====================================================

  const loadUsers = async (showToast = false) => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/lovable/users')
      const result = await response.json()
      
      if (result.success && result.users) {
        setUsers(result.users)
        if (showToast) {
          toast(`✅ ${result.users.length} usuários carregados`)
        }
      } else {
        toast(`❌ ${result.error || 'Erro ao carregar'}`, 'error')
      }
    } catch (error) {
      toast(`❌ Erro ao carregar usuários`, 'error')
    }
    
    setRefreshing(false)
    setLoading(false)
  }

  // =====================================================
  // FUNÇÕES DE UTILIDADE
  // =====================================================

  const isUserBanned = (user: LovableUser): boolean => {
    if (!user.banned_until) return false
    const bannedUntil = new Date(user.banned_until)
    const now = new Date()
    return bannedUntil > now
  }

  // Verifica se o usuário tem um ID real do Lovable (não é gerado da sales)
  const hasRealLovableId = (user: LovableUser): boolean => {
    // IDs gerados começam com "sales-" e não são UUIDs válidos do Lovable
    if (!user.id) return false
    return !user.id.startsWith('sales-')
  }

  const getUserStatusBadge = (user: LovableUser) => {
    if (isUserBanned(user)) {
      return (
        <Badge 
          style={{ 
            backgroundColor: '#ef4444',
            color: '#ffffff',
            fontWeight: 600
          }}
          className="border-0 flex items-center gap-1"
        >
          <Ban className="h-3 w-3" />
          Desativado
        </Badge>
      )
    }
    
    return (
      <Badge 
        style={{ 
          backgroundColor: '#10b981',
          color: '#ffffff',
          fontWeight: 600
        }}
        className="border-0 flex items-center gap-1"
      >
        <CheckCircle className="h-3 w-3" />
        Ativo
      </Badge>
    )
  }

  // =====================================================
  // CARREGAMENTO INICIAL
  // =====================================================

  useEffect(() => {
    loadUsers(false) // Não mostrar toast no carregamento inicial
  }, []) // Array vazio para executar apenas uma vez

  // =====================================================
  // CRIAR USUÁRIO
  // =====================================================

  const handleCreateUser = async () => {
    if (!newUserForm.full_name || !newUserForm.email || !newUserForm.password) {
      toast('⚠️ Preencha todos os campos', 'error')
      return
    }

    setCreating(true)

    try {
      const response = await fetch('/api/lovable/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserForm)
      })
      const result = await response.json()

      if (result.success) {
        toast(`✅ Usuário ${newUserForm.email} criado com sucesso`)
        setCreateDialogOpen(false)
        setNewUserForm({ full_name: '', email: '', password: '' })
        loadUsers(false) // Recarregar lista silenciosamente
      } else {
        toast(`❌ ${result.error || 'Erro ao criar'}`, 'error')
      }
    } catch (error) {
      toast(`❌ Erro ao criar usuário`, 'error')
    }

    setCreating(false)
  }

  // =====================================================
  // RESETAR SENHA
  // =====================================================

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast('⚠️ Informe a nova senha', 'error')
      return
    }

    setResetting(true)

    try {
      const response = await fetch('/api/lovable/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword,
        })
      })
      const result = await response.json()

      if (result.success) {
        toast(`✅ Senha de ${selectedUser.email} foi alterada`)
        setResetDialogOpen(false)
        setNewPassword('')
        setSelectedUser(null)
      } else {
        toast(`❌ ${result.error || 'Erro ao resetar'}`, 'error')
      }
    } catch (error) {
      toast(`❌ Erro ao resetar senha`, 'error')
    }

    setResetting(false)
  }

  // =====================================================
  // DESATIVAR/REATIVAR USUÁRIO
  // =====================================================

  const handleDeactivateUser = async () => {
    if (!selectedUser) return

    const isBanned = isUserBanned(selectedUser)
    const action = isBanned ? 'unban' : 'ban'

    setDeactivating(true)

    try {
      const response = await fetch('/api/lovable/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          action,
        })
      })
      const result = await response.json()

      if (result.success) {
        toast(isBanned 
          ? `✅ Usuário ${selectedUser.email} foi reativado`
          : `🔒 Usuário ${selectedUser.email} foi desativado`
        )
        setDeactivateDialogOpen(false)
        setSelectedUser(null)
        loadUsers(false) // Recarregar lista silenciosamente
      } else {
        console.error('Erro ao alterar status:', result)
        toast(`❌ ${result.error || 'Erro ao desativar'}`, 'error')
      }
    } catch (error) {
      toast(`❌ Erro ao desativar usuário`, 'error')
    }

    setDeactivating(false)
  }

  // =====================================================
  // EXCLUIR USUÁRIO
  // =====================================================

  const handleDeleteUser = async () => {
    if (!selectedUser) return

    setDeleting(true)

    try {
      const response = await fetch(`/api/lovable/users?userId=${selectedUser.id}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        toast(`🗑️ Usuário ${selectedUser.email} foi excluído permanentemente`)
        setDeleteDialogOpen(false)
        setSelectedUser(null)
        loadUsers(false) // Recarregar lista silenciosamente
      } else {
        toast(`❌ ${result.error || 'Erro ao excluir'}`, 'error')
      }
    } catch (error) {
      toast(`❌ Erro ao excluir usuário`, 'error')
    }

    setDeleting(false)
  }

  // =====================================================
  // UTILITÁRIOS
  // =====================================================

  // =====================================================
  // BOTÕES DE PÂNICO
  // =====================================================

  const handleResyncSale = async (customerEmail: string) => {
    if (resyncing) return // Evitar cliques duplos

    const confirmed = window.confirm(
      `🔄 Resincronizar venda de ${customerEmail}?\n\n` +
      `Isso irá:\n` +
      `✅ Reprocessar o provisionamento\n` +
      `✅ Criar/atualizar usuário Lovable\n` +
      `✅ Liberar acesso na plataforma\n\n` +
      `Continuar?`
    )

    if (!confirmed) return

    setResyncing(customerEmail)

    try {
      const response = await fetch('/api/admin/resync-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail })
      })

      const result = await response.json()

      if (result.success) {
        toast(
          `✅ ${result.message}\n` +
          `${result.alreadyQueued ? '⚠️ Já estava na fila' : '🆕 Adicionado à fila'}`
        )
        loadUsers(false) // Recarregar lista
      } else {
        toast(`❌ ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Erro ao resincronizar:', error)
      toast('❌ Erro ao processar resincronização', 'error')
    } finally {
      setResyncing(null)
    }
  }

  const handleResendEmail = async (customerEmail: string) => {
    if (resending) return // Evitar cliques duplos

    const confirmed = window.confirm(
      `📧 Reenviar e-mail de boas-vindas para ${customerEmail}?\n\n` +
      `Isso irá:\n` +
      `✅ Enviar novo e-mail com credenciais\n` +
      `✅ Ignorar verificação de "já enviado"\n` +
      `✅ Registrar no histórico\n\n` +
      `Continuar?`
    )

    if (!confirmed) return

    setResending(customerEmail)

    try {
      const response = await fetch('/api/admin/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail })
      })

      const result = await response.json()

      if (result.success) {
        toast(`✅ ${result.message}`)
        loadUsers(false) // Recarregar lista
      } else {
        toast(`❌ ${result.error}`, 'error')
      }
    } catch (error) {
      console.error('Erro ao reenviar email:', error)
      toast('❌ Erro ao processar reenvio', 'error')
    } finally {
      setResending(null)
    }
  }

  // =====================================================
  // UTILITÁRIOS (CONTINUAÇÃO)
  // =====================================================

  const handleGeneratePassword = (target: 'create' | 'reset') => {
    const password = generateSecurePassword(12)
    
    if (target === 'create') {
      setNewUserForm({ ...newUserForm, password })
      setShowPassword(true)
    } else {
      setNewPassword(password)
      setShowNewPassword(true)
    }

    toast('🎲 Senha forte gerada automaticamente')
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast(`📋 ${label} copiado`)
  }

  const formatDate = (date?: string) => {
    if (!date) return 'Nunca'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // =====================================================
  // RENDER
  // =====================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando usuários...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-white">
            <User className="h-8 w-8 text-white" />
            Usuários Lovable
          </h1>
          <p className="text-gray-300 mt-1">
            Gerencie os usuários do sistema externo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsers(true)}
            disabled={refreshing}
            className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3 items-start">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Total de Usuários</CardTitle>
            <User className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="text-3xl font-bold text-white">{users.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">E-mails Confirmados</CardTitle>
            <Mail className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="text-3xl font-bold text-white">
              {users.filter(u => u.email_confirmed_at).length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-200">Admins</CardTitle>
            <Shield className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <div className="text-3xl font-bold text-white">
              {users.filter(u => u.role === 'admin').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Lista de Usuários</CardTitle>
          <CardDescription className="text-gray-300">
            Todos os usuários cadastrados no sistema Lovable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableCaption className="text-gray-400">
              {users.length === 0 ? 'Nenhum usuário encontrado' : `Total: ${users.length} usuários`}
            </TableCaption>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-200">Nome</TableHead>
                <TableHead className="text-gray-200">Email</TableHead>
                <TableHead className="text-gray-200">Status</TableHead>
                <TableHead className="text-gray-200">Role</TableHead>
                <TableHead className="text-gray-200">Criado em</TableHead>
                <TableHead className="text-gray-200">Último Login</TableHead>
                <TableHead className="text-right text-gray-200">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const { displayName, isGenerated } = getDisplayName(
                  user.full_name,
                  user.email
                )
                
                return (
                  <TableRow key={user.id} className="border-gray-700">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{displayName}</span>
                        {isGenerated && (
                          <span title="Nome gerado automaticamente do e-mail">
                            <Sparkles className="w-3 h-3 text-blue-400" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-nowrap">
                        <span className="text-sm text-gray-300 truncate">{user.email}</span>
                        {user.email_confirmed_at && (
                          <Badge variant="success" className="text-xs bg-green-600 text-white whitespace-nowrap flex-shrink-0">
                            ✓ Confirmado
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getUserStatusBadge(user)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        style={{ 
                          backgroundColor: user.role === 'admin' ? '#9333ea' : '#2563eb',
                          color: '#ffffff',
                          fontWeight: 600
                        }}
                        className="border-0"
                      >
                        {user.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-xs text-gray-400">
                      {formatDate(user.last_sign_in_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Resincronizar Venda */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResyncSale(user.email)}
                          disabled={resyncing === user.email}
                          className="text-green-400 hover:text-green-300 hover:bg-gray-700 disabled:opacity-50"
                          title="Resincronizar venda (provisionar acesso)"
                        >
                          {resyncing === user.email ? (
                            <RotateCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Reenviar E-mail */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendEmail(user.email)}
                          disabled={resending === user.email}
                          className="text-purple-400 hover:text-purple-300 hover:bg-gray-700 disabled:opacity-50"
                          title="Reenviar e-mail de boas-vindas"
                        >
                          {resending === user.email ? (
                            <RotateCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>

                        {/* Alterar Senha */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setResetDialogOpen(true)
                          }}
                          className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                          title="Alterar senha"
                        >
                          <Key className="h-4 w-4" />
                        </Button>

                        {/* Desativar/Reativar - Apenas se tem ID real do Lovable */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setDeactivateDialogOpen(true)
                          }}
                          disabled={!hasRealLovableId(user)}
                          className={isUserBanned(user) 
                            ? "text-green-400 hover:text-green-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed" 
                            : "text-yellow-400 hover:text-yellow-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          }
                          title={!hasRealLovableId(user) 
                            ? "Execute 'Resincronizar Venda' primeiro para criar o usuário no Lovable" 
                            : isUserBanned(user) ? "Reativar usuário" : "Desativar usuário"
                          }
                        >
                          {isUserBanned(user) ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                        </Button>

                        {/* Excluir - Apenas se tem ID real do Lovable */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user)
                            setDeleteDialogOpen(true)
                          }}
                          disabled={!hasRealLovableId(user)}
                          className="text-red-400 hover:text-red-300 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                          title={!hasRealLovableId(user) 
                            ? "Execute 'Resincronizar Venda' primeiro para criar o usuário no Lovable" 
                            : "Excluir usuário"
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Criar Usuário */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Criar Novo Usuário</DialogTitle>
            <DialogDescription className="text-gray-400">
              Preencha os dados para criar um novo usuário no Lovable
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-gray-200">Nome Completo</Label>
              <Input
                id="full_name"
                placeholder="João da Silva"
                value={newUserForm.full_name}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, full_name: e.target.value })
                }
                className="border-gray-600 placeholder:text-gray-400"
                style={{ backgroundColor: '#374151', color: '#ffffff' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@exemplo.com"
                value={newUserForm.email}
                onChange={(e) =>
                  setNewUserForm({ ...newUserForm, email: e.target.value })
                }
                className="border-gray-600 placeholder:text-gray-400"
                style={{ backgroundColor: '#374151', color: '#ffffff' }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-200">Senha</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={newUserForm.password}
                    onChange={(e) =>
                      setNewUserForm({ ...newUserForm, password: e.target.value })
                    }
                    className="border-gray-600 placeholder:text-gray-400 pr-10"
                    style={{ backgroundColor: '#374151', color: '#ffffff' }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-300 hover:text-white hover:bg-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGeneratePassword('create')}
                  className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white whitespace-nowrap"
                >
                  🎲 Gerar
                </Button>
                {newUserForm.password && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newUserForm.password, 'Senha')}
                    className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
              className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={creating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Criar Usuário
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Resetar Senha */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Alterar Senha</DialogTitle>
            <DialogDescription className="text-gray-400">
              Defina uma nova senha para <strong className="text-white">{selectedUser?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new_password" className="text-gray-200">Nova Senha</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="new_password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-gray-600 placeholder:text-gray-400 pr-10"
                    style={{ backgroundColor: '#374151', color: '#ffffff' }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-gray-300 hover:text-white hover:bg-gray-600"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleGeneratePassword('reset')}
                  className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white whitespace-nowrap"
                >
                  🎲 Gerar
                </Button>
                {newPassword && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newPassword, 'Nova senha')}
                    className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              disabled={resetting}
              className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleResetPassword} 
              disabled={resetting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {resetting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Alterar Senha
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Desativar/Reativar */}
      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedUser && isUserBanned(selectedUser) ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  Reativar Usuário
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5 text-yellow-400" />
                  Desativar Usuário
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedUser && isUserBanned(selectedUser) ? (
                <>
                  Deseja reativar o usuário <strong className="text-white">{selectedUser?.email}</strong>?
                  <br />
                  <br />
                  O usuário voltará a ter acesso ao sistema Lovable.
                </>
              ) : (
                <>
                  Tem certeza que deseja desativar o usuário <strong className="text-white">{selectedUser?.email}</strong>?
                  <br />
                  <br />
                  O usuário não conseguirá mais fazer login no sistema Lovable até ser reativado.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeactivateDialogOpen(false)}
              disabled={deactivating}
              className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeactivateUser} 
              disabled={deactivating}
              className={selectedUser && isUserBanned(selectedUser)
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-yellow-600 hover:bg-yellow-700 text-white"
              }
            >
              {deactivating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {selectedUser && isUserBanned(selectedUser) ? 'Reativando...' : 'Desativando...'}
                </>
              ) : (
                <>
                  {selectedUser && isUserBanned(selectedUser) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Sim, Reativar
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      Sim, Desativar
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Excluir */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-400" />
              Excluir Usuário
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              <span className="text-red-400 font-semibold">⚠️ ATENÇÃO: Esta ação é irreversível!</span>
              <br />
              <br />
              Tem certeza que deseja excluir permanentemente o usuário <strong className="text-white">{selectedUser?.email}</strong>?
              <br />
              <br />
              Todos os dados deste usuário no Lovable serão removidos permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
              className="border-gray-600 text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteUser} 
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sim, Excluir Permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
