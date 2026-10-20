export interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
  turnstileToken: string;
}

export interface ContactResponse {
  message: string;
}
