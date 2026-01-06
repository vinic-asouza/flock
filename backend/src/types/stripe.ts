export interface StripeSubscription {
  id: string;
  customer_id: string;
  status: string;
  plan_type: '200' | '500' | '800';
  start_date: Date;
  end_date?: Date;
}

export interface CreateCheckoutSessionRequest {
  plan: '200' | '500' | '800';
  church_id?: string; // Opcional, se já tiver igreja cadastrada
}

export interface CreateCheckoutSessionResponse {
  session_id: string;
  url: string;
}

export interface UpdateSubscriptionRequest {
  new_plan: '200' | '500' | '800';
}

