import {
  contactPhoneFromAuthUser,
  openInvoiceConfirmationUrl,
  invoicePaidAtIso,
  paymentRecoveryEventId,
  paymentRecoveryRecordedLate,
  planChangeDedupeKey,
  resolveScheduledCancellation,
  scheduledCancellationStripeEventId,
  subscriptionRenewalEventId,
} from '../billingPresentation';

describe('scheduledCancellationStripeEventId', () => {
  it('monta a chave só quando o cancelamento está agendado', () => {
    expect(scheduledCancellationStripeEventId('sub_1', true, 1760000000)).toBe('sub_1:1760000000');
    expect(scheduledCancellationStripeEventId('sub_1', false, 1760000000)).toBeNull();
    expect(scheduledCancellationStripeEventId('sub_1', true, null)).toBeNull();
    expect(scheduledCancellationStripeEventId('', true, 1760000000)).toBeNull();
  });
});

describe('resolveScheduledCancellation', () => {
  it('grava quando há cancel_at mesmo com a flag falsa', () => {
    expect(
      resolveScheduledCancellation({
        subscriptionId: 'sub_1',
        status: 'active',
        cancelAtPeriodEnd: false,
        cancelAt: 1760000000,
      })
    ).toEqual({ eventId: 'sub_1:1760000000', cancelAt: 1760000000 });
  });

  it('usa o fim do período do item quando a flag vem sem cancel_at', () => {
    expect(
      resolveScheduledCancellation({
        subscriptionId: 'sub_1',
        status: 'active',
        cancelAtPeriodEnd: true,
        cancelAt: null,
        itemPeriodEnd: 1760000000,
      })
    ).toEqual({ eventId: 'sub_1:1760000000', cancelAt: 1760000000 });
  });

  it('ignora assinatura já encerrada e agendamento sem data', () => {
    expect(
      resolveScheduledCancellation({
        subscriptionId: 'sub_1',
        status: 'canceled',
        cancelAtPeriodEnd: true,
        cancelAt: 1760000000,
      })
    ).toBeNull();
    expect(
      resolveScheduledCancellation({
        subscriptionId: 'sub_1',
        status: 'active',
        cancelAtPeriodEnd: false,
        cancelAt: null,
        itemPeriodEnd: 1760000000,
      })
    ).toBeNull();
    expect(
      resolveScheduledCancellation({
        subscriptionId: '  ',
        status: 'active',
        cancelAt: 1760000000,
      })
    ).toBeNull();
  });

  it('separa dois cancelamentos do mesmo período pelo instante do pedido', () => {
    const first = resolveScheduledCancellation({
      subscriptionId: 'sub_1',
      status: 'active',
      cancelAt: 1760000000,
      canceledAt: 1750000000,
    });
    const second = resolveScheduledCancellation({
      subscriptionId: 'sub_1',
      status: 'active',
      cancelAt: 1760000000,
      canceledAt: 1750001000,
    });
    expect(first?.eventId).toBe('sub_1:1760000000:1750000000');
    expect(second?.eventId).toBe('sub_1:1760000000:1750001000');
  });
});

describe('subscriptionRenewalEventId', () => {
  it('amarra a renovação ao cancelamento que ela desfez', () => {
    expect(subscriptionRenewalEventId('sub_1', 'sub_1:1760000000:1750000000')).toBe(
      'sub_1:renewed:sub_1:1760000000:1750000000'
    );
    expect(subscriptionRenewalEventId('sub_1', '  ')).toBeNull();
  });
});

describe('paymentRecoveryRecordedLate', () => {
  it('marca só o registro gravado depois do pagamento', () => {
    expect(paymentRecoveryRecordedLate('2026-10-20T21:01:08.000Z', '2026-10-20T19:52:25.000Z')).toBe(
      true
    );
    expect(paymentRecoveryRecordedLate('2026-10-20T19:52:26.000Z', '2026-10-20T19:52:25.000Z')).toBe(
      false
    );
    expect(paymentRecoveryRecordedLate(null, '2026-10-20T19:52:25.000Z')).toBe(false);
  });
});

describe('invoicePaidAtIso', () => {
  it('usa o paid_at da fatura expandida', () => {
    expect(invoicePaidAtIso({ status_transitions: { paid_at: 1_700_000_000 } })).toBe(
      '2023-11-14T22:13:20.000Z'
    );
    expect(invoicePaidAtIso('in_1')).toBeNull();
    expect(invoicePaidAtIso({ status_transitions: { paid_at: null } })).toBeNull();
  });
});

describe('paymentRecoveryEventId', () => {
  it('amarra a recuperação à fatura paga', () => {
    expect(paymentRecoveryEventId('sub_1', 'in_1')).toBe('sub_1:recovered:in_1');
    expect(paymentRecoveryEventId('sub_1', '  ')).toBeNull();
  });
});

describe('planChangeDedupeKey', () => {
  it('muda com a fatura e ignora plano igual', () => {
    expect(planChangeDedupeKey('sub_1', '800', '500', 'in_a')).toBe('sub_1:plan:800:500:in_a');
    expect(planChangeDedupeKey('sub_1', '500', '800', 'in_b')).not.toBe(
      planChangeDedupeKey('sub_1', '800', '500', 'in_a')
    );
    expect(planChangeDedupeKey('sub_1', '500', '500', 'in_a')).toBeNull();
  });
});

describe('openInvoiceConfirmationUrl', () => {
  it('devolve a URL quando a fatura está aberta', () => {
    expect(
      openInvoiceConfirmationUrl({
        status: 'open',
        hosted_invoice_url: 'https://invoice.stripe.com/i/test',
        amount_remaining: 2999,
      })
    ).toBe('https://invoice.stripe.com/i/test');
  });

  it('omite fatura paga, id solto ou sem valor', () => {
    expect(openInvoiceConfirmationUrl('in_123')).toBeNull();
    expect(
      openInvoiceConfirmationUrl({
        status: 'paid',
        hosted_invoice_url: 'https://invoice.stripe.com/i/test',
        amount_remaining: 0,
      })
    ).toBeNull();
    expect(
      openInvoiceConfirmationUrl({
        status: 'open',
        hosted_invoice_url: 'https://invoice.stripe.com/i/test',
        amount_remaining: 0,
      })
    ).toBeNull();
  });
});

describe('contactPhoneFromAuthUser', () => {
  it('prefere o telefone gravado no metadata do cadastro', () => {
    expect(
      contactPhoneFromAuthUser({
        phone: null,
        user_metadata: { phone: '11999998888' },
      })
    ).toBe('11999998888');
  });

  it('cai para o phone do Auth quando o metadata está vazio', () => {
    expect(contactPhoneFromAuthUser({ phone: '11988887777', user_metadata: {} })).toBe('11988887777');
    expect(contactPhoneFromAuthUser(null)).toBeNull();
  });
});
