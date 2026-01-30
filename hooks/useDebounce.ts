import { useEffect, useState } from 'react'

/**
 * Hook de Debounce
 * Atrasa a atualização de um valor até que o usuário pare de fazer alterações
 * 
 * @param value - Valor a ser "debounced"
 * @param delay - Delay em milissegundos (padrão: 500ms)
 * @returns Valor com debounce aplicado
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Configura o timer
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Limpa o timer se o value mudar antes do delay
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
