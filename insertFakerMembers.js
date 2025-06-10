const faker = {
    nomes: ["Maria", "João", "José", "Ana", "Pedro", "Paulo", "Lucas", "Mateus", "Marcos", "Tiago", 
      "Isabella", "Sofia", "Miguel", "Arthur", "Helena", "Alice", "Laura", "Manuela", "Valentina", 
      "Heitor", "Bernardo", "Davi", "Gabriel", "Júlia", "Lorenzo", "Théo", "Benjamin", "Cecília",
      "Samuel", "Antônio", "Francisco", "Enzo", "Carlos", "Daniel", "Eduardo", "Fernando", "Gustavo",
      "Henrique", "Isaac", "Joaquim", "Leonardo", "Murilo", "Nathan", "Otávio", "Rafael", "Vicente"],
      
    sobrenomes: ["Silva", "Santos", "Oliveira", "Souza", "Ferreira", "Pereira", "Lima", "Costa", 
      "Rodrigues", "Almeida", "Nascimento", "Carvalho", "Araújo", "Ribeiro", "Monteiro", "Mendes",
      "Barros", "Freitas", "Barbosa", "Pinto", "Moura", "Cavalcanti", "Dias", "Castro", "Campos",
      "Cardoso", "Correia", "Cunha", "Gomes", "Martins", "Rocha", "Moreira", "Nunes", "Peixoto",
      "Pires", "Ramos", "Reis", "Teixeira", "Vieira", "Andrade", "Brito", "Machado", "Santana"],
  
    ruas: ["Rua das Flores", "Avenida Brasil", "Rua São João", "Avenida Paulista", 
      "Rua XV de Novembro", "Rua da Paz", "Avenida das Palmeiras", "Rua dos Ipês",
      "Avenida Central", "Rua das Acácias", "Rua dos Girassóis", "Avenida Principal",
      "Rua Santo Antônio", "Avenida Getúlio Vargas", "Rua Dom Pedro II"],
  
    bairros: ["Centro", "Jardim América", "Vila Nova", "Boa Vista", "São José",
      "Santa Cruz", "Bela Vista", "Vila Maria", "Santo Antônio", "Jardim Europa"],
  
    cidades: ["São Paulo", "Rio de Janeiro", "Belo Horizonte", "Salvador", "Brasília",
      "Curitiba", "Fortaleza", "Recife", "Porto Alegre", "Manaus"],
  
    estados: ["SP", "RJ", "MG", "BA", "DF", "PR", "CE", "PE", "RS", "AM"],
  
    roles: ["Membro", "Diácono", "Presbítero", "Evangelista", "Missionário", 
      "Professor(a) EBD", "Líder de Jovens", "Líder de Louvor", "Cooperador(a)"],
  
    ocupacoes: ["Professor(a)", "Médico(a)", "Engenheiro(a)", "Advogado(a)", "Comerciante",
      "Empresário(a)", "Estudante", "Aposentado(a)", "Vendedor(a)", "Administrador(a)",
      "Enfermeiro(a)", "Contador(a)", "Autônomo(a)", "Funcionário(a) Público"],
  
    congregacoes: ["Sede", "Congregação Central", "Congregação Norte", "Congregação Sul",
      "Congregação Leste", "Congregação Oeste", "Congregação Jardim das Oliveiras",
      "Congregação Nova Vida", "Congregação Betel"],
  
    getRandom: (arr) => arr[Math.floor(Math.random() * arr.length)],
    
    getRandomDate: (startYear, endYear) => {
      const start = new Date(startYear, 0, 1);
      const end = new Date(endYear, 11, 31);
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0];
    },
  
    getRandomPhone: () => {
      return `(${Math.floor(Math.random() * 90) + 10})9${Math.floor(Math.random() * 90000000 + 10000000)}`;
    },
  
    getRandomCEP: () => {
      return `${Math.floor(Math.random() * 90000) + 10000}-${Math.floor(Math.random() * 900) + 100}`;
    },
  
    getRandomDocument: () => {
      return `${Math.floor(Math.random() * 900000000) + 100000000}`;
    },
  
    getRandomEmail: (name) => {
      const cleanName = name.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.');
      const domains = ['gmail.com', 'hotmail.com', 'yahoo.com.br', 'outlook.com'];
      return `${cleanName}@${faker.getRandom(domains)}`;
    }
  };
  
  const members = Array.from({ length: 100 }, () => {
    const gender = Math.random() > 0.5 ? 'Masculino' : 'Feminino';
    const name = `${faker.getRandom(faker.nomes)} ${faker.getRandom(faker.sobrenomes)} ${faker.getRandom(faker.sobrenomes)}`;
    const birth = faker.getRandomDate(1925, 2025);
    const baptismDate = Math.random() > 0.3 ? faker.getRandomDate(1924, 2025) : null;
    const number = Math.floor(Math.random() * 2000) + 1;
    
    return {
      name,
      birth,
      gender,
      marital_status: faker.getRandom(['Solteiro', 'Casado', 'Divorciado', 'Viúvo', 'Outro']),
      nationality: 'Brasileiro(a)',
      document: faker.getRandomDocument(),
      spouse: Math.random() > 0.7 ? `${faker.getRandom(faker.nomes)} ${faker.getRandom(faker.sobrenomes)}` : null,
      address: `${faker.getRandom(faker.ruas)}, ${number}`,
      complement: Math.random() > 0.5 ? `Apto ${Math.floor(Math.random() * 1000) + 1}` : null,
      cep: faker.getRandomCEP(),
      neighborhood: faker.getRandom(faker.bairros),
      city: faker.getRandom(faker.cidades),
      state: faker.getRandom(faker.estados),
      phone: faker.getRandomPhone(),
      whatsapp: Math.random() > 0.3 ? faker.getRandomPhone() : null,
      email: faker.getRandomEmail(name),
      baptism_date: baptismDate,
      role: faker.getRandom(faker.roles),
      occupation: faker.getRandom(faker.ocupacoes),
      admission: 'Transferência',
      admission_date: faker.getRandomDate(2000, 2015),
      congregation: faker.getRandom(faker.congregacoes),
      active: true
    };
  });
  
  members;