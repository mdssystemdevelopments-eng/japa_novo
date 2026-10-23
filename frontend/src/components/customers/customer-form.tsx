'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchCep } from '@/lib/cep';
import { useState } from 'react';

export type CustomerFormValues = {
  name: string;
  document: string;
  phone: string;
  phoneSecondary: string;
  whatsapp: string;
  email: string;
  postalCode: string;
  street: string;
  streetNumber: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  contactOrigin: string;
  category: string;
  internalNotes: string;
  marketingOptIn: boolean;
};

export const emptyCustomerForm: CustomerFormValues = {
  name: '',
  document: '',
  phone: '',
  phoneSecondary: '',
  whatsapp: '',
  email: '',
  postalCode: '',
  street: '',
  streetNumber: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  contactOrigin: '',
  category: '',
  internalNotes: '',
  marketingOptIn: false,
};

export function customerToForm(c: Record<string, unknown>): CustomerFormValues {
  return {
    name: String(c.name ?? ''),
    document: String(c.document ?? ''),
    phone: String(c.phone ?? ''),
    phoneSecondary: String(c.phoneSecondary ?? ''),
    whatsapp: String(c.whatsapp ?? ''),
    email: String(c.email ?? ''),
    postalCode: String(c.postalCode ?? ''),
    street: String(c.street ?? ''),
    streetNumber: String(c.streetNumber ?? ''),
    complement: String(c.complement ?? ''),
    district: String(c.district ?? ''),
    city: String(c.city ?? ''),
    state: String(c.state ?? ''),
    contactOrigin: String(c.contactOrigin ?? ''),
    category: String(c.category ?? ''),
    internalNotes: String(c.internalNotes ?? ''),
    marketingOptIn: Boolean(c.marketingOptIn),
  };
}

export function formToPayload(values: CustomerFormValues) {
  const trim = (s: string) => s.trim() || undefined;
  return {
    name: values.name.trim(),
    document: trim(values.document),
    phone: trim(values.phone),
    phoneSecondary: trim(values.phoneSecondary),
    whatsapp: trim(values.whatsapp),
    email: trim(values.email),
    postalCode: trim(values.postalCode),
    street: trim(values.street),
    streetNumber: trim(values.streetNumber),
    complement: trim(values.complement),
    district: trim(values.district),
    city: trim(values.city),
    state: trim(values.state)?.toUpperCase(),
    contactOrigin: trim(values.contactOrigin),
    category: trim(values.category),
    internalNotes: trim(values.internalNotes),
    marketingOptIn: values.marketingOptIn,
  };
}

export function CustomerForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  disabled,
  error,
}: {
  values: CustomerFormValues;
  onChange: (v: CustomerFormValues) => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  error?: string | null;
}) {
  const [cepLoading, setCepLoading] = useState(false);

  const set = (patch: Partial<CustomerFormValues>) =>
    onChange({ ...values, ...patch });

  const loadCep = async () => {
    setCepLoading(true);
    try {
      const addr = await fetchCep(values.postalCode);
      if (addr) {
        onChange({
          ...values,
          street: addr.street || values.street,
          district: addr.district || values.district,
          city: addr.city || values.city,
          state: addr.state || values.state,
        });
      }
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Nome ou razão social"
          value={values.name}
          onChange={(e) => set({ name: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="CPF ou CNPJ"
          value={values.document}
          onChange={(e) => set({ document: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="Telefone principal"
          value={values.phone}
          onChange={(e) => set({ phone: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="Telefone secundário"
          value={values.phoneSecondary}
          onChange={(e) => set({ phoneSecondary: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="WhatsApp"
          value={values.whatsapp}
          onChange={(e) => set({ whatsapp: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="E-mail"
          type="email"
          value={values.email}
          onChange={(e) => set({ email: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="Origem do contato"
          value={values.contactOrigin}
          onChange={(e) => set({ contactOrigin: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="Categoria"
          value={values.category}
          onChange={(e) => set({ category: e.target.value })}
          disabled={disabled}
        />
      </div>

      <fieldset className="rounded-md border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium text-slate-800">
          Endereço
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-end gap-2">
            <Input
              label="CEP"
              value={values.postalCode}
              onChange={(e) => set({ postalCode: e.target.value })}
              disabled={disabled}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={loadCep}
              disabled={disabled || cepLoading}
            >
              {cepLoading ? '...' : 'Buscar'}
            </Button>
          </div>
          <Input
            label="Logradouro"
            value={values.street}
            onChange={(e) => set({ street: e.target.value })}
            disabled={disabled}
          />
          <Input
            label="Número"
            value={values.streetNumber}
            onChange={(e) => set({ streetNumber: e.target.value })}
            disabled={disabled}
          />
          <Input
            label="Complemento"
            value={values.complement}
            onChange={(e) => set({ complement: e.target.value })}
            disabled={disabled}
          />
          <Input
            label="Bairro"
            value={values.district}
            onChange={(e) => set({ district: e.target.value })}
            disabled={disabled}
          />
          <Input
            label="Cidade"
            value={values.city}
            onChange={(e) => set({ city: e.target.value })}
            disabled={disabled}
          />
          <Input
            label="Estado (UF)"
            maxLength={2}
            value={values.state}
            onChange={(e) => set({ state: e.target.value.toUpperCase() })}
            disabled={disabled}
          />
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={values.marketingOptIn}
          onChange={(e) => set({ marketingOptIn: e.target.checked })}
          disabled={disabled}
        />
        Autoriza mensagens comerciais (quando aplicável)
      </label>

      <div>
        <label className="text-sm font-medium text-slate-700">
          Observações internas
        </label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={3}
          value={values.internalNotes}
          onChange={(e) => set({ internalNotes: e.target.value })}
          disabled={disabled}
        />
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!disabled ? (
        <Button type="button" onClick={onSubmit}>
          {submitLabel}
        </Button>
      ) : null}
    </div>
  );
}
