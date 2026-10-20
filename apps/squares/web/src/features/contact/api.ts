import { baseApi } from '../../api/baseApi';
import type { ContactRequest, ContactResponse } from '../../types/contact';

export const contactApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    submitContact: build.mutation<ContactResponse, ContactRequest>({
      query: (body) => ({ url: '/contact', method: 'POST', body }),
    }),
  }),
});

export const { useSubmitContactMutation } = contactApi;
