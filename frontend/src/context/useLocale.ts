import { useContext } from "react";
import { LocaleContext, type LocaleContextValue } from "./localeContext";

export const useLocale = (): LocaleContextValue => useContext(LocaleContext);
