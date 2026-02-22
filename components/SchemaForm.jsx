'use client';

/**
 * Schema-Driven Form Renderer
 * Renders forms dynamically from JSON Schema (generated from Zod)
 */

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Field type mapping from JSON Schema
const getFieldType = (property) => {
  if (property.enum) return 'select';
  if (property.type === 'boolean') return 'checkbox';
  if (property.type === 'number' || property.type === 'integer') return 'number';
  if (property.type === 'array') return 'array';
  if (property.format === 'email') return 'email';
  if (property.format === 'uri' || property.format === 'url') return 'url';
  return 'text';
};

// Get display label from property name
const getLabel = (key, property) => {
  if (property.title) return property.title;
  // Convert camelCase to Title Case
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

// Individual field renderer
const SchemaField = ({ name, property, value, onChange, required, errors }) => {
  const fieldType = getFieldType(property);
  const label = getLabel(name, property);
  const error = errors?.[name];

  const baseClasses = "w-full mt-1 border rounded-md px-3 py-2 bg-background text-sm";
  const errorClasses = error ? "border-destructive" : "border-input";

  switch (fieldType) {
    case 'select':
      return (
        <div className="space-y-1">
          <Label className="text-sm">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <select
            className={`${baseClasses} ${errorClasses}`}
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
          >
            <option value="">Select {label.toLowerCase()}...</option>
            {property.enum.map((opt) => (
              <option key={opt} value={opt}>
                {opt.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </option>
            ))}
          </select>
          {property.description && (
            <p className="text-xs text-muted-foreground">{property.description}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id={name}
            checked={!!value}
            onChange={(e) => onChange(name, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <Label htmlFor={name} className="text-sm">
            {label}
          </Label>
          {property.description && (
            <span className="text-xs text-muted-foreground">({property.description})</span>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-1">
          <Label className="text-sm">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value ? Number(e.target.value) : '')}
            placeholder={property.description || `Enter ${label.toLowerCase()}`}
            min={property.minimum}
            max={property.maximum}
            className={errorClasses}
          />
          {property.description && (
            <p className="text-xs text-muted-foreground">{property.description}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'array':
      // For arrays of strings (like email lists)
      const arrayValue = Array.isArray(value) ? value.join(', ') : value || '';
      return (
        <div className="space-y-1">
          <Label className="text-sm">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type="text"
            value={arrayValue}
            onChange={(e) => {
              const items = e.target.value.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
              onChange(name, items);
            }}
            placeholder={property.description || 'Enter comma-separated values'}
            className={errorClasses}
          />
          {property.description && (
            <p className="text-xs text-muted-foreground">{property.description}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );

    case 'email':
    case 'url':
    case 'text':
    default:
      return (
        <div className="space-y-1">
          <Label className="text-sm">
            {label} {required && <span className="text-destructive">*</span>}
          </Label>
          <Input
            type={fieldType}
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder={property.description || `Enter ${label.toLowerCase()}`}
            className={errorClasses}
          />
          {property.description && (
            <p className="text-xs text-muted-foreground">{property.description}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      );
  }
};

// Conditional field group renderer (for unions/oneOf)
const ConditionalFieldGroup = ({ schema, value, onChange, errors }) => {
  // Handle anyOf/oneOf schemas
  const options = schema.anyOf || schema.oneOf || [];
  
  if (options.length === 0) {
    return null;
  }

  // Determine which option is currently selected based on discriminator field
  const getSelectedOption = () => {
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      if (option.properties) {
        // Check if any discriminator property matches
        for (const [key, prop] of Object.entries(option.properties)) {
          if (prop.const && value[key] === prop.const) {
            return i;
          }
        }
      }
    }
    return 0;
  };

  const selectedIdx = getSelectedOption();
  const selectedOption = options[selectedIdx];

  return (
    <div className="space-y-4">
      {/* Option selector if multiple options */}
      {options.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {options.map((opt, idx) => {
            // Find a title or discriminator for this option
            const title = opt.title || 
              Object.entries(opt.properties || {}).find(([k, v]) => v.const)?.[1]?.const?.replace(/_/g, ' ') ||
              `Option ${idx + 1}`;
            
            return (
              <Badge
                key={idx}
                variant={idx === selectedIdx ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => {
                  // When switching options, set the discriminator value
                  const newValue = { ...value };
                  for (const [key, prop] of Object.entries(opt.properties || {})) {
                    if (prop.const) {
                      newValue[key] = prop.const;
                    }
                  }
                  onChange(newValue);
                }}
              >
                {title.replace(/_/g, ' ')}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Render fields for selected option */}
      {selectedOption?.properties && (
        <div className="space-y-3">
          {Object.entries(selectedOption.properties).map(([key, prop]) => {
            // Skip const properties (discriminators)
            if (prop.const) return null;
            
            const isRequired = selectedOption.required?.includes(key);
            return (
              <SchemaField
                key={key}
                name={key}
                property={prop}
                value={value[key]}
                onChange={(k, v) => onChange({ ...value, [k]: v })}
                required={isRequired}
                errors={errors}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// Main SchemaForm component
export default function SchemaForm({
  schema,
  value = {},
  onChange,
  title,
  description,
  errors = {},
  className = '',
}) {
  if (!schema) {
    return (
      <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
        No schema available
      </div>
    );
  }

  // Handle union types (anyOf/oneOf)
  if (schema.anyOf || schema.oneOf) {
    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader className="pb-3">
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className={title || description ? '' : 'pt-4'}>
          <ConditionalFieldGroup
            schema={schema}
            value={value}
            onChange={onChange}
            errors={errors}
          />
        </CardContent>
      </Card>
    );
  }

  // Handle object type
  if (schema.type === 'object' || schema.properties) {
    const properties = schema.properties || {};
    const required = schema.required || [];

    // Determine field order
    const fieldOrder = schema['ui:order'] || Object.keys(properties);

    return (
      <Card className={className}>
        {(title || description) && (
          <CardHeader className="pb-3">
            {title && <CardTitle className="text-base">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className={`space-y-4 ${title || description ? '' : 'pt-4'}`}>
          {fieldOrder.map((key) => {
            const property = properties[key];
            if (!property) return null;

            return (
              <SchemaField
                key={key}
                name={key}
                property={property}
                value={value[key]}
                onChange={(k, v) => onChange({ ...value, [k]: v })}
                required={required.includes(key)}
                errors={errors}
              />
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Fallback for simple types
  return (
    <div className={`p-4 ${className}`}>
      <SchemaField
        name="value"
        property={schema}
        value={value}
        onChange={(_, v) => onChange(v)}
        errors={errors}
      />
    </div>
  );
}

// Helper hook for form state management
export function useSchemaForm(initialValue = {}) {
  const [value, setValue] = useState(initialValue);
  const [errors, setErrors] = useState({});

  const handleChange = (newValue) => {
    if (typeof newValue === 'object') {
      setValue(newValue);
    } else {
      setValue(newValue);
    }
    // Clear errors on change
    setErrors({});
  };

  const validate = (schema) => {
    // Basic validation - in production, use Zod on server
    const newErrors = {};
    if (schema.required) {
      for (const key of schema.required) {
        if (!value[key]) {
          newErrors[key] = `${key} is required`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    value,
    setValue,
    errors,
    setErrors,
    handleChange,
    validate,
  };
}
