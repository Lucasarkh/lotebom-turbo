export const useMasks = () => {
  const maskPhone = (value: string) => {
    if (!value) return ''
    
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Limit to 11 digits (Brazilian mobile with DDD)
    const limited = digits.substring(0, 11)
    
    if (limited.length <= 2) {
      return limited.length > 0 ? `(${limited}` : ''
    }
    if (limited.length <= 6) {
      return `(${limited.substring(0, 2)}) ${limited.substring(2)}`
    }
    if (limited.length <= 10) {
      // Fixed line format: (XX) XXXX-XXXX
      return `(${limited.substring(0, 2)}) ${limited.substring(2, 6)}-${limited.substring(6)}`
    }
    // Mobile format: (XX) XXXXX-XXXX
    return `(${limited.substring(0, 2)}) ${limited.substring(2, 7)}-${limited.substring(7)}`
  }

  const unmask = (value: string) => {
    return value.replace(/\D/g, '')
  }

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  }

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 10 && digits.length <= 11
  }

  return {
    maskPhone,
    unmask,
    validateEmail,
    validatePhone
  }
}
