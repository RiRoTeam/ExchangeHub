import type { ru } from "./ru";

/**
 * Типизация ключей: t("programs.nope") не соберётся.
 * Русский словарь — источник правды, английский обязан его повторять.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof ru;
    };
    returnNull: false;
  }
}
