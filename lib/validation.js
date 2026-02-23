'use client';

/**
 * Validation Utilities for Access Management Platform
 * Provides naming conventions, validation rules, and formatting helpers
 */

// ============================================
// NAMING CONVENTIONS
// ============================================

/**
 * Validates and formats an access item label
 * Rules:
 * - Must be 3-100 characters
 * - Must start with a letter
 * - Can contain letters, numbers, spaces, hyphens, underscores
 * - No consecutive special characters
 * - Proper capitalization (Title Case recommended)
 */
export function validateAccessItemLabel(label) {
  const errors = [];
  
  if (!label || typeof label !== 'string') {
    return { valid: false, errors: ['Label is required'], formatted: '' };
  }
  
  const trimmed = label.trim();
  
  if (trimmed.length < 3) {
    errors.push('Label must be at least 3 characters');
  }
  
  if (trimmed.length > 100) {
    errors.push('Label must be less than 100 characters');
  }
  
  if (!/^[a-zA-Z]/.test(trimmed)) {
    errors.push('Label must start with a letter');
  }
  
  if (/[^a-zA-Z0-9\s\-_()]/.test(trimmed)) {
    errors.push('Label can only contain letters, numbers, spaces, hyphens, underscores, and parentheses');
  }
  
  if (/[\s\-_]{2,}/.test(trimmed)) {
    errors.push('Label cannot have consecutive special characters');
  }
  
  // Check for placeholder/test patterns
  const testPatterns = [
    /^test\s/i,
    /\btest\b$/i,
    /\bplaceholder\b/i,
    /\btodo\b/i,
    /\bxxx+\b/i,
    /\basdf\b/i,
  ];
  
  for (const pattern of testPatterns) {
    if (pattern.test(trimmed)) {
      errors.push('Label appears to be a placeholder - please use a descriptive name');
      break;
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    formatted: formatLabel(trimmed),
  };
}

/**
 * Format a label to Title Case with proper spacing
 */
export function formatLabel(label) {
  if (!label) return '';
  
  return label
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[-_]+/g, match => match[0])
    .split(' ')
    .map(word => {
      // Keep acronyms uppercase
      if (/^[A-Z]{2,}$/.test(word)) return word;
      // Capitalize first letter
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Validates an MCC ID or Manager Account ID
 * Format: XXX-XXX-XXXX (digits with dashes)
 */
export function validateMccId(mccId) {
  if (!mccId) {
    return { valid: false, errors: ['MCC ID is required'], formatted: '' };
  }
  
  // Remove all non-digits
  const digitsOnly = mccId.replace(/\D/g, '');
  
  if (digitsOnly.length !== 10) {
    return { 
      valid: false, 
      errors: ['MCC ID must be 10 digits (format: XXX-XXX-XXXX)'],
      formatted: mccId 
    };
  }
  
  // Format as XXX-XXX-XXXX
  const formatted = `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
  
  return { valid: true, errors: [], formatted };
}

/**
 * Validates a Business Manager ID
 * Format: Numeric string, typically 15-16 digits
 */
export function validateBusinessManagerId(bmId) {
  if (!bmId) {
    return { valid: false, errors: ['Business Manager ID is required'], formatted: '' };
  }
  
  const digitsOnly = bmId.replace(/\D/g, '');
  
  if (digitsOnly.length < 10 || digitsOnly.length > 20) {
    return {
      valid: false,
      errors: ['Business Manager ID should be 10-20 digits'],
      formatted: bmId,
    };
  }
  
  return { valid: true, errors: [], formatted: digitsOnly };
}

/**
 * Validates an email address
 */
export function validateEmail(email) {
  if (!email) {
    return { valid: false, errors: ['Email is required'], formatted: '' };
  }
  
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, errors: ['Invalid email format'], formatted: trimmed };
  }
  
  // Check for placeholder emails
  const placeholderPatterns = [
    /^test@/,
    /^example@/,
    /^user@/,
    /^admin@example/,
    /@test\./,
    /@example\./,
  ];
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(trimmed)) {
      return { 
        valid: false, 
        errors: ['Please use a real email address, not a placeholder'],
        formatted: trimmed 
      };
    }
  }
  
  return { valid: true, errors: [], formatted: trimmed };
}

/**
 * Validates a role name
 */
export function validateRoleName(roleName) {
  if (!roleName) {
    return { valid: false, errors: ['Role name is required'], formatted: '' };
  }
  
  const trimmed = roleName.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, errors: ['Role name must be at least 2 characters'], formatted: trimmed };
  }
  
  if (trimmed.length > 50) {
    return { valid: false, errors: ['Role name must be less than 50 characters'], formatted: trimmed };
  }
  
  return { valid: true, errors: [], formatted: formatLabel(trimmed) };
}

/**
 * Validates a property ID (GA4)
 * Format: Numeric string
 */
export function validatePropertyId(propId) {
  if (!propId) {
    return { valid: false, errors: ['Property ID is required'], formatted: '' };
  }
  
  const digitsOnly = propId.replace(/\D/g, '');
  
  if (digitsOnly.length < 6 || digitsOnly.length > 12) {
    return {
      valid: false,
      errors: ['Property ID should be 6-12 digits'],
      formatted: propId,
    };
  }
  
  return { valid: true, errors: [], formatted: digitsOnly };
}

/**
 * Validates an Ad Account ID
 * Format: Can be numeric or alphanumeric depending on platform
 */
export function validateAdAccountId(accountId, platform = 'generic') {
  if (!accountId) {
    return { valid: false, errors: ['Ad Account ID is required'], formatted: '' };
  }
  
  const trimmed = accountId.trim();
  
  // Platform-specific validation
  switch (platform) {
    case 'google-ads':
      // Google Ads: XXX-XXX-XXXX format
      return validateMccId(trimmed);
      
    case 'meta':
      // Meta: act_XXXXXXXXXX or just digits
      const metaDigits = trimmed.replace(/^act_/, '').replace(/\D/g, '');
      if (metaDigits.length < 10 || metaDigits.length > 20) {
        return { valid: false, errors: ['Meta Ad Account ID should be 10-20 digits'], formatted: trimmed };
      }
      return { valid: true, errors: [], formatted: `act_${metaDigits}` };
      
    default:
      if (trimmed.length < 5) {
        return { valid: false, errors: ['Ad Account ID seems too short'], formatted: trimmed };
      }
      return { valid: true, errors: [], formatted: trimmed };
  }
}

// ============================================
// FIELD VALIDATORS BY TYPE
// ============================================

export const fieldValidators = {
  label: validateAccessItemLabel,
  email: validateEmail,
  mccId: validateMccId,
  managerAccountId: validateMccId,
  businessManagerId: validateBusinessManagerId,
  propertyId: validatePropertyId,
  adAccountId: validateAdAccountId,
  roleName: validateRoleName,
};

/**
 * Validate a field based on its key
 */
export function validateField(fieldKey, value, context = {}) {
  // Check if there's a specific validator
  const validatorKey = Object.keys(fieldValidators).find(key => 
    fieldKey.toLowerCase().includes(key.toLowerCase())
  );
  
  if (validatorKey) {
    return fieldValidators[validatorKey](value, context.platform);
  }
  
  // Default validation for unknown fields
  if (!value || (typeof value === 'string' && !value.trim())) {
    return { valid: false, errors: ['This field is required'], formatted: '' };
  }
  
  return { valid: true, errors: [], formatted: value };
}

// ============================================
// FORMAT HELPERS
// ============================================

/**
 * Format a config key for display (camelCase to Title Case)
 */
export function formatConfigKey(key) {
  if (!key) return '';
  
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/Id$/, ' ID')
    .replace(/Mcc/, 'MCC')
    .replace(/Sso/, 'SSO')
    .replace(/Pam/, 'PAM')
    .trim();
}

/**
 * Sanitize user input (remove potential XSS)
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export default {
  validateAccessItemLabel,
  validateMccId,
  validateBusinessManagerId,
  validateEmail,
  validateRoleName,
  validatePropertyId,
  validateAdAccountId,
  validateField,
  formatLabel,
  formatConfigKey,
  sanitizeInput,
};
