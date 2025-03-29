import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { Lock, Mail, Eye, EyeOff, AlertCircle, Shield, ArrowRight, X } from 'lucide-react';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const { signIn, signUp, requestPasswordReset } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email) {
        throw new Error('Por favor, preencha o email');
      }

      if (isSignUp) {
        // For signup, store email in localStorage before redirect
        localStorage.setItem('signup_email', email);
        // Redirect to subscription page
        window.location.href = 'https://clkdmg.site/subscribe/prime-erp-finance';
        return;
      }

      if (!password) {
        throw new Error('Por favor, preencha a senha');
        return;
      }

      if (password.length < 6) {
        throw new Error('A senha deve ter pelo menos 6 caracteres');
        return;
      }

      await signIn(email, password);
    } catch (err) {
      console.error('Auth error:', err);
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else {
          setError('Ocorreu um erro. Por favor, tente novamente.');
        }
      } else {
        setError('Ocorreu um erro inesperado');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email) {
        throw new Error('Por favor, insira seu email');
      }

      await requestPasswordReset(email);
      alert('Email de recuperação enviado! Por favor, verifique sua caixa de entrada e clique no link para redefinir sua senha.');
      setIsRecovering(false);
    } catch (error) {
      console.error('Recovery error:', error);
      setError(error instanceof Error ? error.message : 'Erro ao enviar email de recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="w-full max-w-md px-8 py-12 bg-white rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <img 
            src="https://i.ibb.co/Qp1Gq3K/prime-logo.png" 
            alt="Prime Gestão & Consultoria" 
            className="h-12 mx-auto mb-6"
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isRecovering 
              ? 'Recuperar Senha'
              : isSignUp 
                ? 'Criar Conta' 
                : 'Bem-vindo de volta!'
            }
          </h2>
          <p className="text-gray-600">
            {isRecovering
              ? 'Digite seu email para recuperar sua senha'
              : isSignUp 
                ? 'Digite seu email para criar sua conta'
                : 'Faça login para acessar sua conta'
            }
          </p>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {isRecovering ? (
          <form onSubmit={handleRecoverySubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="seu@email.com"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>Enviar Email</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsRecovering(false);
                  setError(null);
                }}
                className="w-full text-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                disabled={loading}
              >
                Voltar ao login
              </button>
            </div>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="seu@email.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {!isSignUp && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Senha
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-12 py-3 w-full bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecovering(true);
                        setError(null);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Esqueceu sua senha?
                    </button>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? 'Assinar' : 'Entrar'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setEmail('');
                setPassword('');
                setError(null);
              }}
              className="w-full text-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
              disabled={loading}
            >
              {isSignUp ? 'Fazer login' : 'Criar uma conta'}
            </button>
          </>
        )}

        {showPrivacyPolicy && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center text-gray-900">
                  <Shield className="w-5 h-5 mr-2" />
                  Política de Privacidade
                </h2>
                <button
                  onClick={() => setShowPrivacyPolicy(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="sr-only">Fechar</span>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="prose prose-blue max-w-none">
                  <h3>1. Introdução</h3>
                  <p>
                    Esta política de privacidade descreve como coletamos, usamos e protegemos suas informações pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD).
                  </p>

                  <h3>2. Dados Coletados</h3>
                  <p>Coletamos apenas os dados necessários para o funcionamento do sistema:</p>
                  <ul>
                    <li>Email para identificação e comunicação</li>
                    <li>Dados financeiros inseridos por você</li>
                    <li>Informações de uso do sistema</li>
                  </ul>

                  <h3>3. Finalidade do Tratamento</h3>
                  <p>Seus dados são utilizados para:</p>
                  <ul>
                    <li>Autenticação e segurança da conta</li>
                    <li>Processamento de transações financeiras</li>
                    <li>Geração de relatórios e análises</li>
                    <li>Melhorias no sistema</li>
                  </ul>

                  <h3>4. Compartilhamento de Dados</h3>
                  <p>
                    Não compartilhamos seus dados com terceiros, exceto quando necessário para:
                  </p>
                  <ul>
                    <li>Cumprir obrigações legais</li>
                    <li>Proteger direitos legais</li>
                    <li>Responder a solicitações judiciais</li>
                  </ul>

                  <h3>5. Segurança dos Dados</h3>
                  <p>Protegemos seus dados através de:</p>
                  <ul>
                    <li>Criptografia de ponta a ponta</li>
                    <li>Controles de acesso rigorosos</li>
                    <li>Monitoramento contínuo</li>
                    <li>Backups seguros</li>
                  </ul>

                  <h3>6. Seus Direitos (LGPD)</h3>
                  <p>Você tem direito a:</p>
                  <ul>
                    <li>Acessar seus dados</li>
                    <li>Corrigir dados incorretos</li>
                    <li>Solicitar exclusão de dados</li>
                    <li>Revogar consentimento</li>
                    <li>Solicitar portabilidade</li>
                  </ul>

                  <h3>7. Retenção de Dados</h3>
                  <p>
                    Mantemos seus dados apenas pelo tempo necessário para:
                  </p>
                  <ul>
                    <li>Cumprir obrigações legais</li>
                    <li>Resolver disputas</li>
                    <li>Fazer cumprir nossos acordos</li>
                  </ul>

                  <h3>8. Cookies e Tecnologias Similares</h3>
                  <p>
                    Utilizamos cookies essenciais para:
                  </p>
                  <ul>
                    <li>Manter sua sessão ativa</li>
                    <li>Lembrar suas preferências</li>
                    <li>Garantir a segurança</li>
                  </ul>

                  <h3>9. Contato</h3>
                  <p>
                    Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato através do email: dpo@primegestao.com.br
                  </p>

                  <h3>10. Atualizações</h3>
                  <p>
                    Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas.
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl">
                <button
                  onClick={() => setShowPrivacyPolicy(false)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Auth;