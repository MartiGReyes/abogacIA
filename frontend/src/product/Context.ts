import { createContext } from "react"
import type { ProductStore } from "./Store"

// Keep context identity stable when the store module is hot-reloaded.
export const ProductContext = createContext<ProductStore | null>(null)
