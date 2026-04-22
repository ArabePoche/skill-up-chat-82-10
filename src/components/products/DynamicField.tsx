import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldConfig } from '@/types/product-form';

interface DynamicFieldProps {
  config: FieldConfig;
  value: any;
  onChange: (name: string, value: any) => void;
  formData: Record<string, any>;
  error?: string;
}

const DynamicField: React.FC<DynamicFieldProps> = ({ config, value, onChange, formData, error }) => {
  const handleChange = (newValue: any) => {
    onChange(config.name, newValue);
  };

  // Vérifier si le champ doit être affiché (champ conditionnel)
  if (config.conditional) {
    const conditionalValue = formData[config.conditional.field];
    const shouldShow = conditionalValue === config.conditional.value;
    if (!shouldShow) return null;
  }

  const renderField = () => {
    switch (config.type) {
      case 'text':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={config.placeholder}
            required={config.required}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(parseFloat(e.target.value) || 0)}
            placeholder={config.placeholder}
            required={config.required}
            min={0}
            step={0.01}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            required={config.required}
          />
        );

      case 'select':
        return (
          <Select 
            value={value || config.defaultValue || ''} 
            onValueChange={handleChange}
            required={config.required}
          >
            <SelectTrigger>
              <SelectValue placeholder={config.placeholder || 'Sélectionner...'} />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean':
        return (
          <Select 
            value={value || config.defaultValue || 'false'} 
            onValueChange={handleChange}
            required={config.required}
          >
            <SelectTrigger>
              <SelectValue placeholder={config.placeholder || 'Sélectionner...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Oui</SelectItem>
              <SelectItem value="false">Non</SelectItem>
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={config.placeholder}
            required={config.required}
            rows={3}
          />
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {config.options?.map((option) => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) ? value.includes(option.value) : false}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleChange([...currentValues, option.value]);
                    } else {
                      handleChange(currentValues.filter((v: string) => v !== option.value));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {config.label}
        {config.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default DynamicField;
