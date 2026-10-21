import {
  formatChurchAddressLine,
  subscriptionHistoryDetail,
} from '../../../../frontend/src/utils/settingsDisplay';

// Fora do tsconfig do backend: o helper vive no frontend e o rootDir não alcança esse arquivo.

const formatAccessDate = () => '21/11/2026';

describe('subscriptionHistoryDetail', () => {
  it('mostra a data de fim e omite active → active', () => {
    expect(
      subscriptionHistoryDetail(
        {
          event_type: 'cancellation_scheduled',
          old_plan: null,
          new_plan: '200',
          old_status: 'active',
          new_status: 'active',
          payload: { cancel_at: 1_763_683_200 },
        },
        formatAccessDate,
      ),
    ).toBe('Plano 200 · acesso até 21/11/2026');
  });

  it('mantém a transição quando o status muda', () => {
    expect(
      subscriptionHistoryDetail(
        {
          event_type: 'payment_recovered',
          old_plan: '200',
          new_plan: '200',
          old_status: 'past_due',
          new_status: 'active',
          payload: null,
        },
        formatAccessDate,
      ),
    ).toBe('Plano 200 · past_due → active');
  });

  it('omite a seta de status igual numa troca de plano', () => {
    expect(
      subscriptionHistoryDetail(
        {
          event_type: 'plan_changed',
          old_plan: '100',
          new_plan: '200',
          old_status: 'active',
          new_status: 'active',
        },
        formatAccessDate,
      ),
    ).toBe('Plano 100 → 200');
  });
});

describe('formatChurchAddressLine', () => {
  it('não repete cidade e UF já presentes no texto', () => {
    expect(
      formatChurchAddressLine(
        'Rua E2E Pago 20, São Paulo/SP, CEP 01310-100',
        'São Paulo',
        'SP',
      ),
    ).toBe('Rua E2E Pago 20, São Paulo/SP, CEP 01310-100');
  });

  it('acrescenta cidade e UF quando o texto é só o logradouro', () => {
    expect(formatChurchAddressLine('Rua das Flores, 10', 'São Paulo', 'sp')).toBe(
      'Rua das Flores, 10, São Paulo - SP',
    );
  });

  it('reconhece a cidade sem acento no texto livre', () => {
    expect(formatChurchAddressLine('Rua 1, Sao Paulo/SP', 'São Paulo', 'SP')).toBe(
      'Rua 1, Sao Paulo/SP',
    );
  });
});
