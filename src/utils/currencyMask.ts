function onlyNumbers(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCurrency(value: string): string {
  const numbers = onlyNumbers(value);
  
  if (!numbers) {
    return '';
  }

  // Converte para centavos
  const cents = numbers.padStart(1, '0');
  
  // Converte para número
  const numberValue = Number(cents) / 100;
  
  // Formata para o padrão brasileiro
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numberValue);
}

export function unmaskCurrency(value: string): number {
  const numbers = onlyNumbers(value);
  return numbers ? Number(numbers) / 100 : 0;
}

export function parseCurrencyInput(value: string): string {
  // Se o valor incluir vírgula, assume que é um valor colado no formato brasileiro
  if (value.includes(',')) {
    const cleanValue = value
      .replace(/[^\d,]/g, '') // Remove tudo exceto números e vírgula
      .replace(',', '.'); // Substitui vírgula por ponto
    const numericValue = parseFloat(cleanValue);
    if (!isNaN(numericValue)) {
      return maskCurrency(String(numericValue * 100));
    }
  }
  
  // Caso contrário, trata como entrada normal de números
  return maskCurrency(value);
}