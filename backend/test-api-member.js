const axios = require('axios');

const API_URL = 'http://localhost:4000';

async function testCreateMemberViaAPI() {
  try {
    console.log('🔍 Testando criação de membro via API...');
    
    // Primeiro, fazer login para obter o token
    console.log('🔐 Fazendo login...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'test@example.com', // Substitua por um email válido
      password: 'password123'     // Substitua por uma senha válida
    });
    
    console.log('✅ Login realizado com sucesso');
    
    // Extrair cookies do login
    const cookies = loginResponse.headers['set-cookie'];
    console.log('🍪 Cookies recebidos:', cookies);
    
    // Criar membro
    console.log('👤 Criando membro...');
    const memberData = {
      name: 'Teste API Logs',
      email: 'teste-api@logs.com',
      phone: '11999999999',
      birth: '1990-01-01'
    };
    
    const memberResponse = await axios.post(`${API_URL}/api/members`, memberData, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('✅ Membro criado:', memberResponse.data.id);
    
    // Verificar logs
    console.log('📊 Verificando logs...');
    const logsResponse = await axios.get(`${API_URL}/api/account/logs`, {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });
    
    console.log('📈 Logs encontrados:', logsResponse.data.data.length);
    
    if (logsResponse.data.data.length > 0) {
      console.log('✅ Logs estão sendo gerados!');
      logsResponse.data.data.forEach((log, index) => {
        console.log(`  ${index + 1}. ${log.entity} ${log.action} - ${log.created_at}`);
      });
    } else {
      console.log('❌ Nenhum log foi encontrado');
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Erro da API:', error.response.status, error.response.data);
    } else {
      console.error('❌ Erro geral:', error.message);
    }
  }
}

testCreateMemberViaAPI();
