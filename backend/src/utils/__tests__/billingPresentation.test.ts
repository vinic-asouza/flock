import {
  contactPhoneFromAuthUser,
  openInvoiceConfirmationUrl,
  resolveScheduledCancellation,
  scheduledCancellationStripeEventId,
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
