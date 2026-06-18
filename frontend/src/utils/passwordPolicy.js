const WEAK_PASSWORDS = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  'password1234',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'admin',
  'admin123',
  'administrator',
  'letmein',
  'welcome',
  'welcome1',
  'student123',
  'trainer2000',
  'trainer2003',
  'changeme',
  'secret',
  'abc123',
  '111111',
  '000000',
])

export const PASSWORD_MIN_LENGTH = 12

const RULES = [
  {
    id: 'length',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'upper',
    label: 'One uppercase letter',
    test: (value) => /[A-Z]/.test(value),
  },
  {
    id: 'lower',
    label: 'One lowercase letter',
    test: (value) => /[a-z]/.test(value),
  },
  {
    id: 'number',
    label: 'One number',
    test: (value) => /[0-9]/.test(value),
  },
  {
    id: 'special',
    label: 'One special character',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
  {
    id: 'notWeak',
    label: 'Not a common password',
    test: (value) => !WEAK_PASSWORDS.has(value.trim().toLowerCase()),
  },
]

export function evaluatePasswordStrength(password) {
  const value = password ?? ''
  const checks = RULES.map((rule) => ({ ...rule, passed: rule.test(value) }))
  const passedCount = checks.filter((c) => c.passed).length
  const score = passedCount / checks.length

  let label = 'Too weak'
  let tone = 'weak'
  if (score >= 1) {
    label = 'Strong'
    tone = 'strong'
  } else if (score >= 0.83) {
    label = 'Good'
    tone = 'good'
  } else if (score >= 0.5) {
    label = 'Fair'
    tone = 'fair'
  }

  return { checks, score, label, tone, isValid: passedCount === checks.length }
}

export function validatePassword(password) {
  const { checks, isValid } = evaluatePasswordStrength(password)
  if (isValid) return []
  return checks.filter((c) => !c.passed).map((c) => c.label)
}

export function passwordsMatch(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password.'
  if (password !== confirmPassword) return 'Passwords do not match.'
  return ''
}
