# 🔧 Guia Técnico de Autenticação - Para Desenvolvedores

## 📋 Índice

1. [Implementação Backend](#implementação-backend)
2. [Implementação Frontend](#implementação-frontend)
3. [APIs e Endpoints](#apis-e-endpoints)
4. [Configurações de Segurança](#configurações-de-segurança)
5. [Testes e Debug](#testes-e-debug)
6. [Manutenção](#manutenção)

---

## 🔧 Implementação Backend

### 1. Estrutura de Controllers

#### AuthController - Fluxo Principal
```typescript
// backend/src/controllers/authController.ts

export const register = async (req: Request, res: Response) => {
  try {
    // 1. Validação de dados
    const { error: validationError } = validateChurch(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: validationError.details.map(detail => detail.message)
      });
    }

    // 2. Verificar CNPJ único
    const { data: existingChurch } = await supabase
      .from('churches')
      .select('id')
      .eq('cnpj', cnpj)
      .single();

    if (existingChurch) {
      return res.status(400).json({
        error: 'CNPJ já cadastrado'
      });
    }

    // 3. Criar usuário no Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      phone,
      options: {
        emailRedirectTo: `${process.env.APP_URL}/auth/callback`
      }
    });

    // 4. Inserir dados da igreja
    const { data: churchRecord } = await supabase
      .from('churches')
      .insert([{
        user_id: authData.user.id,
        cnpj,
        ...churchData
      }])
      .select()
      .single();

    // 5. Configurar cookies seguros
    if (authData.session) {
      setAccessToken(res, authData.session.access_token);
      setRefreshToken(res, authData.session.refresh_token);
      setSessionCookie(res, {
        user: authData.user,
        expires_at: authData.session.expires_at
      });
    }

    res.status(201).json({
      message: 'Igreja registrada com sucesso',
      church: churchRecord
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};
```

#### Login Controller
```typescript
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Autenticar com Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData.user) {
      return res.status(401).json({
        error: 'Credenciais inválidas'
      });
    }

    // 2. Buscar dados da igreja
    const { data: churchData, error: churchError } = await supabase
      .from('churches')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();

    if (churchError) {
      return res.status(404).json({
        error: 'Igreja não encontrada'
      });
    }

    // 3. Configurar cookies seguros
    setAccessToken(res, authData.session.access_token);
    setRefreshToken(res, authData.session.refresh_token);
    setSessionCookie(res, {
      user: authData.user,
      expires_at: authData.session.expires_at
    });

    res.json({
      message: 'Login realizado com sucesso',
      church: churchData
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};
```

#### Logout Controller
```typescript
export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Verificar autenticação
    if (!req.user) {
      return res.status(401).json({
        error: 'Não autorizado'
      });
    }

    // 2. Obter token
    let token = req.cookies[cookieConfig.names.accessToken];
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    // 3. Adicionar à blacklist
    if (token) {
      if (!global.tokenBlacklist) {
        global.tokenBlacklist = new Set();
      }
      global.tokenBlacklist.add(token);
    }

    // 4. Limpar cookies
    clearAuthCookies(res);

    res.json({
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    clearAuthCookies(res);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};
```

### 2. Middleware de Autenticação

```typescript
// backend/src/middlewares/auth.ts

const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Obter token (cookie preferido, header fallback)
    let token = req.cookies[cookieConfig.names.accessToken];
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        error: 'Token não fornecido',
        details: 'Faça login para acessar este recurso'
      });
    }

    // 2. Verificar blacklist
    if (global.tokenBlacklist && global.tokenBlacklist.has(token)) {
      return res.status(401).json({
        error: 'Token revogado',
        details: 'Este token foi invalidado. Faça login novamente.'
      });
    }

    // 3. Validar com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        error: 'Token inválido ou expirado'
      });
    }

    // 4. Adicionar usuário ao request
    req.user = {
      id: user.id,
      email: user.email || ''
    };
    
    next();

  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
};
```

### 3. Utilitários de Cookies

```typescript
// backend/src/utils/cookieUtils.ts

export const cookieConfig = {
  names: {
    accessToken: 'flock_access_token',
    refreshToken: 'flock_refresh_token',
    session: 'flock_session',
  },
  expiration: {
    accessToken: 15 * 60 * 1000, // 15 minutos
    refreshToken: 7 * 24 * 60 * 60 * 1000, // 7 dias
    session: 15 * 60 * 1000, // 15 minutos
  },
  security: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  },
};

export const setAccessToken = (res: Response, token: string): void => {
  res.cookie(cookieConfig.names.accessToken, token, {
    ...cookieConfig.security,
    maxAge: cookieConfig.expiration.accessToken,
    path: '/'
  });
};

export const clearAuthCookies = (res: Response): void => {
  const cookieNames = Object.values(cookieConfig.names);
  
  cookieNames.forEach(cookieName => {
    res.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'lax'
    });
    
    res.clearCookie(cookieName, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    res.clearCookie(cookieName);
  });
};
```

### 4. Validações

#### Validador de Igreja
```typescript
// backend/src/validators/churchValidator.ts

const churchSchema = Joi.object<ChurchRegistrationData>({
  email: Joi.string().email().required(),
  
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'A senha deve ter no mínimo 8 caracteres',
      'string.pattern.base': 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número',
      'any.required': 'Senha é obrigatória'
    }),

  cnpj: cnpjSchema, // Validação com dígitos verificadores
  
  phone: Joi.string()
    .pattern(/^[0-9]+$/)
    .min(10)
    .max(11)
    .required(),
    
  // ... outros campos
});
```

#### Validador de CNPJ
```typescript
// backend/src/validators/cnpjValidator.ts

export function isValidCNPJ(cnpj: string): boolean {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Calcular primeiro dígito
  let sum = 0;
  let weight = 5;
  
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const firstDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(cleanCNPJ[12]) !== firstDigit) return false;
  
  // Calcular segundo dígito
  sum = 0;
  weight = 6;
  
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCNPJ[i]) * weight;
    weight = weight === 2 ? 9 : weight - 1;
  }
  
  const secondDigit = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(cleanCNPJ[13]) === secondDigit;
}
```

---

## 🎨 Implementação Frontend

### 1. Context de Autenticação

```typescript
// frontend/src/context/AuthContext.tsx

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Church | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOperationLoading, setIsOperationLoading] = useState(false);

  // Inicialização automática
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Aguardar processamento de cookies
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar autenticação
        const response = await apiService.isAuthenticated();
        
        if (response) {
          const church = await apiService.getChurch();
          if (church) {
            setUser(church);
            setSession({
              access_token: 'stored_in_cookie',
              token_type: 'bearer',
              expires_in: 900,
              expires_at: Date.now() + 15 * 60 * 1000,
              refresh_token: 'stored_in_cookie',
              user: {
                id: church.user_id,
                email: '',
                // ... outros campos
              }
            });
          }
        }
      } catch (error) {
        console.error('Erro ao inicializar autenticação:', error);
        setUser(null);
        setSession(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (data: LoginData): Promise<void> => {
    try {
      setIsOperationLoading(true);
      const response = await apiService.login(data);
      setUser(response.data.church);
      // ... configurar sessão
    } catch (error: unknown) {
      throw preserveErrorProperties(error);
    } finally {
      setIsOperationLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsOperationLoading(true);
      await apiService.logout();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Erro durante logout:', error);
      setUser(null);
      setSession(null);
    } finally {
      setIsOperationLoading(false);
    }
  }, []);

  const value: AuthContextType = useMemo(() => ({
    user,
    session,
    isLoading,
    isOperationLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    forgotPassword,
    changePassword,
    resetPassword,
  }), [user, session, isLoading, isOperationLoading, login, register, logout, forgotPassword, changePassword, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
```

### 2. Serviço de API

```typescript
// frontend/src/services/api.ts

class ApiService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
    
    this.api = axios.create({
      baseURL,
      timeout: 10000,
      withCredentials: true, // Cookies automáticos
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor de resposta para tratamento de erros
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        // Não redirecionar para login se for endpoint de verificação
        const isCheckAuthEndpoint = error.config?.url?.includes('/refresh/check');
        
        if (error.response?.status === 401 && !isCheckAuthEndpoint) {
          window.location.href = '/login';
        }
        
        // Tratamento de erros da API
        if (error.response?.data) {
          const responseData = error.response.data;
          let errorMessage = 'Erro desconhecido';
          let errorDetails: string | string[] | undefined;
          
          if (typeof responseData === 'object') {
            if ('error' in responseData) {
              errorMessage = responseData.error;
            }
            if ('details' in responseData) {
              errorDetails = responseData.details;
            }
          }
          
          const enhancedError = new Error(errorMessage);
          (enhancedError as any).details = errorDetails;
          (enhancedError as any).status = error.response.status;
          
          return Promise.reject(enhancedError);
        }
        
        return Promise.reject(error);
      }
    );
  }

  async login(data: LoginData): Promise<LoginResponse> {
    const response: AxiosResponse<LoginResponse> = await this.api.post('/auth/login', data);
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.api.post('/auth/logout');
    } catch (error) {
      console.warn('Erro ao fazer logout no servidor:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const response = await this.api.get('/refresh/check');
      return response.data.authenticated;
    } catch (error) {
      return false;
    }
  }

  async getChurch(): Promise<Church | null> {
    try {
      const response = await this.api.get('/refresh/check');
      return response.data.church || null;
    } catch (error) {
      return null;
    }
  }
}
```

### 3. Proteção de Rotas

```typescript
// frontend/src/components/ProtectedRoute.tsx

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-900 mb-2">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

### 4. Páginas de Autenticação

#### Login Page
```typescript
// frontend/src/app/(auth)/login/page.tsx

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'A senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),
});

function LoginPageComponent() {
  const { login, isOperationLoading } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      // Redirecionamento automático pelo AuthContext
    } catch (err: unknown) {
      // Tratamento de erro
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Campos do formulário */}
    </form>
  );
}
```

---

## 🔌 APIs e Endpoints

### 1. Endpoints de Autenticação

| Método | Endpoint | Descrição | Rate Limit |
|--------|----------|-----------|------------|
| POST | `/api/auth/register` | Registro de igreja | 3 req/hora |
| POST | `/api/auth/login` | Login de usuário | 10 req/15min |
| POST | `/api/auth/logout` | Logout seguro | 10 req/15min |

### 2. Endpoints de Senha

| Método | Endpoint | Descrição | Rate Limit |
|--------|----------|-----------|------------|
| POST | `/api/password/forgot` | Solicitar recuperação | 5 req/hora |
| POST | `/api/password/reset` | Reset com token | 5 req/hora |
| POST | `/api/password/change` | Alterar senha | 5 req/15min |

### 3. Endpoints de Renovação

| Método | Endpoint | Descrição | Rate Limit |
|--------|----------|-----------|------------|
| POST | `/api/refresh/refresh` | Renovar token | 10 req/15min |
| GET | `/api/refresh/check` | Verificar auth | 10 req/15min |

### 4. Exemplos de Uso

#### Registro
```bash
curl -X POST https://api.flock.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "igreja@exemplo.com",
    "password": "MinhaSenh@123",
    "phone": "11999999999",
    "name": "Igreja Exemplo",
    "denomination": "Presbiteriana",
    "address": "Rua Exemplo, 123",
    "city": "São Paulo",
    "state": "SP",
    "cnpj": "12345678000195"
  }'
```

#### Login
```bash
curl -X POST https://api.flock.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "igreja@exemplo.com",
    "password": "MinhaSenh@123"
  }'
```

#### Logout
```bash
curl -X POST https://api.flock.com/api/auth/logout \
  -H "Cookie: flock_access_token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🛡️ Configurações de Segurança

### 1. Rate Limiting

```typescript
// Configuração geral
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requisições por IP
  message: {
    error: 'Muitas requisições',
    details: 'Você excedeu o limite de requisições. Tente novamente em 15 minutos.'
  }
});

// Configuração específica para login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 tentativas de login
  skipSuccessfulRequests: true, // Não contar sucessos
});
```

### 2. Cookies Seguros

```typescript
// Configuração de produção
const cookieConfig = {
  httpOnly: true,        // Não acessível via JavaScript
  secure: true,          // Apenas HTTPS
  sameSite: 'strict',   // Proteção CSRF
  path: '/',            // Disponível em toda aplicação
  maxAge: 15 * 60 * 1000 // 15 minutos
};
```

### 3. CORS

```typescript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  optionsSuccessStatus: 200
}));
```

### 4. Helmet

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## 🧪 Testes e Debug

### 1. Testes de Autenticação

```typescript
// backend/tests/auth.test.ts

describe('Authentication', () => {
  test('should register new church', async () => {
    const churchData = {
      email: 'test@example.com',
      password: 'TestPass123',
      phone: '11999999999',
      name: 'Test Church',
      denomination: 'Test',
      address: 'Test Address',
      city: 'Test City',
      state: 'SP',
      cnpj: '11222333000181'
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(churchData);

    expect(response.status).toBe(201);
    expect(response.body.church).toBeDefined();
  });

  test('should login with valid credentials', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'TestPass123'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']).toBeDefined();
  });

  test('should reject invalid credentials', async () => {
    const loginData = {
      email: 'test@example.com',
      password: 'WrongPassword'
    };

    const response = await request(app)
      .post('/api/auth/login')
      .send(loginData);

    expect(response.status).toBe(401);
  });
});
```

### 2. Debug de Cookies

```typescript
// Endpoint de debug
app.get('/debug/cookies', (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: req.headers.cookie,
    userAgent: req.headers['user-agent']
  });
});
```

### 3. Logs de Segurança

```typescript
// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Log de tentativas de login
app.post('/api/auth/login', (req, res, next) => {
  console.log(`Login attempt: ${req.body.email} from ${req.ip}`);
  next();
});
```

---

## 🔧 Manutenção

### 1. Monitoramento

```typescript
// Métricas de autenticação
const authMetrics = {
  loginAttempts: 0,
  successfulLogins: 0,
  failedLogins: 0,
  rateLimitHits: 0
};

// Middleware de métricas
app.use((req, res, next) => {
  if (req.path.includes('/auth/login')) {
    authMetrics.loginAttempts++;
  }
  next();
});
```

### 2. Limpeza de Blacklist

```typescript
// Limpeza automática da blacklist
setInterval(() => {
  if (global.tokenBlacklist) {
    const now = Date.now();
    // Remover tokens expirados
    for (const token of global.tokenBlacklist) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.exp * 1000 < now) {
          global.tokenBlacklist.delete(token);
        }
      } catch (error) {
        global.tokenBlacklist.delete(token);
      }
    }
  }
}, 60 * 60 * 1000); // A cada hora
```

### 3. Backup de Configurações

```bash
# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/auth_config_$DATE"

mkdir -p $BACKUP_DIR
cp -r backend/src/validators $BACKUP_DIR/
cp -r backend/src/utils $BACKUP_DIR/
cp backend/.env $BACKUP_DIR/
cp backend/package.json $BACKUP_DIR/

echo "Backup criado em: $BACKUP_DIR"
```

---

*Documentação técnica atualizada em: $(date)*
*Versão: 1.0.0*
*Para desenvolvedores e arquitetos*
