"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, X } from "lucide-react";
import { whatsappUrl } from "@/lib/data/company";
import { PRODUCT_RANGE_KEYS, type ProductRangeKey } from "@/lib/data/productRange";
import { useQuoteListStore } from "@/lib/stores";
import SectionHeader from "./SectionHeader";
import { CONTAINER, SECTION_IDS } from "./layout";

type FormField = "name" | "company" | "phone" | "notes";
type FormErrors = Partial<Record<"name" | "phone", string>>;

const inputClass =
  "w-full h-14 px-5 bg-lb-navy-deep border border-lb-navy-line text-white text-base placeholder:text-white/35 outline-none focus:border-lb-sky transition-colors";

export default function QuoteFormSection() {
  const t = useTranslations("HomeRedesign.quote");
  const tp = useTranslations("HomeRedesign.products");
  const categories = useQuoteListStore((state) => state.categories);
  const addCategory = useQuoteListStore((state) => state.add);
  const removeCategory = useQuoteListStore((state) => state.remove);

  const [form, setForm] = useState<Record<FormField, string>>({
    name: "",
    company: "",
    phone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const categoryName = (key: ProductRangeKey) => tp(`items.${key}.name`);
  const availableCategories = PRODUCT_RANGE_KEYS.filter((key) => !categories.includes(key));

  const handleChange =
    (field: FormField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (field === "name" || field === "phone") {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };

  const buildMessage = () => {
    const lines = [t("message.greeting"), ""];
    lines.push(t("message.name", { value: form.name.trim() }));
    if (form.company.trim()) lines.push(t("message.company", { value: form.company.trim() }));
    lines.push(t("message.phone", { value: form.phone.trim() }));
    if (categories.length > 0) {
      lines.push(
        t("message.categories", {
          value: categories.map(categoryName).join(t("listSeparator")),
        })
      );
    }
    if (form.notes.trim()) lines.push(t("message.notes", { value: form.notes.trim() }));
    return lines.join("\n");
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (!form.name.trim()) nextErrors.name = t("nameRequired");
    if (!form.phone.trim()) nextErrors.phone = t("phoneRequired");
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Nothing is stored: the details go straight into a WhatsApp message
    window.open(whatsappUrl(buildMessage()), "_blank", "noopener,noreferrer");
  };

  return (
    <section id={SECTION_IDS.quote} className="scroll-mt-20 bg-lb-navy text-white py-16 lg:py-24">
      <div className={CONTAINER}>
        <SectionHeader title={t("title")} description={t("description")} tone="dark" />

        <form onSubmit={handleSubmit} noValidate className="grid gap-6 md:grid-cols-2">
          <Field label={t("name")} htmlFor="quote-name" error={errors.name}>
            <input
              id="quote-name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder={t("namePlaceholder")}
              aria-invalid={!!errors.name}
              className={inputClass}
            />
          </Field>

          <Field label={t("company")} htmlFor="quote-company">
            <input
              id="quote-company"
              type="text"
              autoComplete="organization"
              value={form.company}
              onChange={handleChange("company")}
              placeholder={t("companyPlaceholder")}
              className={inputClass}
            />
          </Field>

          <Field label={t("phone")} htmlFor="quote-phone" error={errors.phone}>
            <input
              id="quote-phone"
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder={t("phonePlaceholder")}
              aria-invalid={!!errors.phone}
              className={inputClass}
            />
          </Field>

          <Field label={t("categories")} htmlFor="quote-category">
            <div className="relative">
              <select
                id="quote-category"
                value=""
                onChange={(e) => {
                  if (e.target.value) addCategory(e.target.value as ProductRangeKey);
                }}
                disabled={availableCategories.length === 0}
                className={`${inputClass} appearance-none cursor-pointer pr-12 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">{t("addCategory")}</option>
                {availableCategories.map((key) => (
                  <option key={key} value={key} className="text-lb-navy">
                    {categoryName(key)}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/80"
                aria-hidden
              />
            </div>

            {/* Selected categories (shared with the product-range "add to list" buttons) */}
            <div className="mt-3 flex flex-wrap gap-2 min-h-9">
              {categories.length === 0 ? (
                <span className="text-sm text-white/45 self-center">{t("noCategories")}</span>
              ) : (
                categories.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 h-9 pl-3 pr-1.5 border border-lb-navy-line bg-lb-navy-deep text-sm"
                  >
                    {categoryName(key)}
                    <button
                      type="button"
                      onClick={() => removeCategory(key)}
                      aria-label={t("removeCategory", { name: categoryName(key) })}
                      className="w-6 h-6 flex items-center justify-center text-white/60 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </Field>

          <Field label={t("notes")} htmlFor="quote-notes" className="md:col-span-2">
            <textarea
              id="quote-notes"
              rows={5}
              value={form.notes}
              onChange={handleChange("notes")}
              placeholder={t("notesPlaceholder")}
              className={`${inputClass} h-auto py-4 resize-y`}
            />
          </Field>

          <div className="md:col-span-2">
            <button
              type="submit"
              className="h-14 px-10 bg-lb-red hover:bg-lb-red-dark text-white text-base font-medium transition-colors cursor-pointer"
            >
              {t("submit")}
            </button>
            <p className="mt-5 text-sm text-white/55">{t("privacy")}</p>
          </div>
        </form>
      </div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="block mb-3 text-sm text-white/70">
        {label}
      </label>
      {children}
      {error && <p className="mt-2 text-sm text-[#ff8a80]">{error}</p>}
    </div>
  );
}
